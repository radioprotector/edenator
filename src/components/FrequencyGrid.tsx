import { RefObject, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

import { generateNumericArray } from '../utils';
import { useStore } from '../store/visualizerStore';
import { ComponentDepths } from './ComponentDepths';

/**
 * The material to use for all frequency lines.
 */
const frequencyLineMaterial = new THREE.LineBasicMaterial();

/**
 * The number of frequency rows to display.
 */
const FREQUENCY_ROWS: number = 10;

/**
 * The z-spacing between each row.
 */
const DEPTH_SPACING: number = -20;

/**
 * The number of frequency buckets to render out for each row.
 */
const LINE_BUCKETS: number = 64; // XXX: Must be equal to analyzer.frequencyBinCount

/**
 * The x-width of each frequency bucket.
 */
const BUCKET_WIDTH: number = 0.5;

/**
 * The y-height of each frequency bucket.
 */
const BUCKET_HEIGHT: number = 5.0;

/**
 * The number of anchor points to use on each end. This is used to avoid "cliffs"
 * caused by large magnitudes of either the extremely low or extremely high frequencies.
 */
const ANCHOR_POINTS: number = 8;

function FrequencyGrid(props: { audio: RefObject<HTMLAudioElement>, analyser: RefObject<AnalyserNode> }): JSX.Element {
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
      line.position.set(0, -10, ComponentDepths.FrequencyEnd + (DEPTH_SPACING * rowIndex));
      line.scale.set(0.6, THREE.MathUtils.mapLinear(rowIndex, 0, FREQUENCY_ROWS - 1, 1.0, 0.1), 1.0);

      // Ensure the line is stored in a mesh
      rowLines.current[rowIndex] = line;

      // Convert the line to the equivalent JSX element
      return <primitive 
        object={line}
        key={rowIndex}
      />
    })
    }, [frequencyGeometry]);

  useFrame(() => {
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
      // Apply the point set to all line rows, going front-to-back
      const lineRow = rowLines.current[rowIndex];
      const baseDepth = ComponentDepths.FrequencyEnd + (DEPTH_SPACING * rowIndex);

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
