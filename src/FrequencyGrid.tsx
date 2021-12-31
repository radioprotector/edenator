import { RefObject, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

import { generateNumericArray } from './Utils';
import { useStore } from './visualizerStore';

/**
 * The material to use for all frequency lines.
 */
const frequencyLineMaterial = new THREE.LineBasicMaterial();

function FrequencyGrid(props: { audio: RefObject<HTMLAudioElement>, analyser: RefObject<AnalyserNode> }): JSX.Element {
  // Track how many rows we have, where the first row starts, depth-wise, and the spacing between each row  
  const FREQUENCY_ROWS: number = 10;
  const STARTING_DEPTH: number = -10;
  const DEPTH_SPACING: number = -20;

  // XXX: LINE_BUCKETS should be equal to analyzer.frequencyBinCount
  const LINE_BUCKETS = 64;
  const BUCKET_WIDTH = 0.5;
  const BUCKET_HEIGHT = 5.0;

  // On either end, we want a set number of points to ease down the minimum/maximum frequencies to 0
  // and avoid sharp cliffs
  const ANCHOR_POINTS = 8;

  // Pull our store items
  const trackAnalysis = useStore(state => state.analysis);

  // Because the line material is cached across multiple renders, just ensure the color reflects the state.
  frequencyLineMaterial.color = useStore().theme.frequencyGrid.lineColor;

  useEffect(() => useStore.subscribe(
    state => state.theme.frequencyGrid.lineColor,
    (newLineColor) => {
      frequencyLineMaterial.color = newLineColor;
    }),
    []);

  // Construct the set of points to use for each line
  const pointSet = useMemo(() => {
    const points: THREE.Vector3[] = [];

    // Start by adding anchor points on the left-hand side and use a different scale just for the anchors
    // Ideally we want something like
    // |--25% anchors--|----50% points----|--25% anchors--|
    const anchorIncrement = (LINE_BUCKETS * BUCKET_WIDTH) / (4 * ANCHOR_POINTS);
    let currentX = -(anchorIncrement * ANCHOR_POINTS) - (LINE_BUCKETS * BUCKET_WIDTH / 2);

    for (let i = 0; i < ANCHOR_POINTS; i++) {
      points.push(new THREE.Vector3(currentX, 0, 0));
      currentX += anchorIncrement;
    }

    // Now start distributing the "normal" points around zero
    for(let i = 0; i < LINE_BUCKETS; i++) {
      points.push(new THREE.Vector3(currentX, 0, 0));
      currentX += BUCKET_WIDTH;
    }

    // Add the ending anchors
    for (let i = 0; i < ANCHOR_POINTS; i++) {
      points.push(new THREE.Vector3(currentX, 0, 0));
      currentX += anchorIncrement;
    }    

    return points;
  }, []);

  // Construct the geometry from those points
  const frequencyGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setFromPoints(pointSet);
    return geometry;
  }, [pointSet]);

  // Construct multiple lines from the geometry
  const rowLines = useRef<THREE.Line[]>([]);
  const rowElements = useMemo(() => {
    return generateNumericArray(FREQUENCY_ROWS).map((rowIndex) => {
      const line = new THREE.Line(frequencyGeometry, frequencyLineMaterial);
      line.position.set(0, -10, STARTING_DEPTH + (DEPTH_SPACING * rowIndex));
      line.scale.set(0.6, THREE.MathUtils.mapLinear(rowIndex, 0, FREQUENCY_ROWS - 1, 1.0, 0.1), 1.0);

      // Ensure the line is stored in a mesh
      rowLines.current[rowIndex] = line;

      // Convert the line to the equivalent JSX element
      return <primitive 
        object={line}
        key={rowIndex}
      />
    })
    }, [frequencyGeometry, STARTING_DEPTH, DEPTH_SPACING, FREQUENCY_ROWS]);

  useFrame((state, delta) => {
    if (props.analyser.current === null || props.audio.current === null) {
      return;
    }

    const frequencies = new Uint8Array(props.analyser.current.frequencyBinCount);
    props.analyser.current.getByteFrequencyData(frequencies);

    // Skip over the four anchor points at the beginning and the four anchor points at the end
    for(let i = 0; i < frequencies.length; i++) {
      // Ensure that we're skipping over the anchors when accessing points, so that
      // frequencies[0] will correspond with pointSet[ANCHOR_POINTS]
      pointSet[i + ANCHOR_POINTS].y = (frequencies[i] / 255.0) * BUCKET_HEIGHT;
    }

    // Use the anchor points to scale down the edges
    let leftmostFrequency = (frequencies[0] / 255.0) * BUCKET_HEIGHT;
    let rightmostFrequency = (frequencies[frequencies.length - 1] / 255.0) * BUCKET_HEIGHT;

    // Move outward on the lefthand side (but don't touch the bucket at 0)
    for(let i = ANCHOR_POINTS - 1; i > 0; i--) {
      leftmostFrequency = leftmostFrequency / 1.618;
      pointSet[i].y = leftmostFrequency;
    }

    // Move outward on the righthand side (but again skip over the last bucket)
    for (let i = LINE_BUCKETS + ANCHOR_POINTS; i < pointSet.length - 1; i++) {
      rightmostFrequency = rightmostFrequency / 1.618;
      pointSet[i].y = rightmostFrequency;
    }

    // Calculate how much of the measure, by percentage has elapsed by now
    let measurePercentage = 0;
    const secondsPerMeasure = trackAnalysis.secondsPerMeasure;

    if (props.audio.current.currentTime > 0) {
      measurePercentage = (props.audio.current.currentTime % secondsPerMeasure) / secondsPerMeasure;
    }

    // Update all of the rows
    for(let rowIndex = 0; rowIndex < rowLines.current.length; rowIndex++) {
      // Apply the point set to all line rows
      const lineRow = rowLines.current[rowIndex];
      const baseDepth = STARTING_DEPTH + (DEPTH_SPACING * rowIndex);

      // Hide all line rows when we don't have a track analysis
      lineRow.visible = !trackAnalysis.isEmpty;

      lineRow.geometry.setFromPoints(pointSet);
      lineRow.geometry.computeBoundingBox();

      // Move forward the Z by the row spacing * the % of the measure completed.
      // This ensures that each row will approach the previous row's starting point,
      // but will snap back to the starting point once the new measure starts
      if (props.audio.current.currentTime > 0) {
        lineRow.position.z = baseDepth - (DEPTH_SPACING * measurePercentage);
      }
      else {
        lineRow.position.z = baseDepth;
      }
    }
  });

  return (
    <group>
      {rowElements}
    </group>
  );
}

export default FrequencyGrid;
