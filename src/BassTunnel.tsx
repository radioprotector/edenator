import { RefObject, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { generateNumericArray } from './Utils';
import { TrackAnalysis } from './TrackAnalysis';

const QUARTER_TURN = Math.PI / 2;

export function BassTunnel(props: { audio: RefObject<HTMLAudioElement>, analyser: RefObject<AnalyserNode>, trackAnalysis: TrackAnalysis }) {
  const SEGMENTS_PER_SIDE = 10;
  const SEGMENT_DEPTH = 10;
  const SEGMENT_WIDTH = 2;
  const SEGMENT_HEIGHT = 10;
  const START_DEPTH = -10;
  const HORIZ_OFFSET = 10;
  const lineColor = new THREE.Color(0x8f074b);
  const fillerColor = new THREE.Color(0x850707);

  // When we normally try to display a standard box geometry using wireframes,
  // it will display each side using two triangles. We want pure lines,
  // so we'll use a set of lines (with appropriate scaling) to approximate quads.
  const boxLineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();

    geometry.setFromPoints([
      // Right line, front face
      new THREE.Vector3(0.5, -0.5, 0.5),
      new THREE.Vector3(0.5, 0.5, 0.5),

      // Top line, front face
      new THREE.Vector3(0.5, 0.5, 0.5),
      new THREE.Vector3(-0.5, 0.5, 0.5),

      // Left line, front face
      new THREE.Vector3(-0.5, 0.5, 0.5),
      new THREE.Vector3(-0.5, -0.5, 0.5),

      // Bottom line, front face
      new THREE.Vector3(-0.5, -0.5, 0.5),
      new THREE.Vector3(0.5, -0.5, 0.5),

      // Top-left faces connector
      new THREE.Vector3(-0.5, 0.5, 0.5),
      new THREE.Vector3(-0.5, 0.5, -0.5),

      // Bottom-left faces connector
      new THREE.Vector3(-0.5, -0.5, 0.5),
      new THREE.Vector3(-0.5, -0.5, -0.5),

      // Top-right faces connector
      new THREE.Vector3(0.5, 0.5, 0.5),
      new THREE.Vector3(0.5, 0.5, -0.5),

      // Bottom-right faces connector
      new THREE.Vector3(0.5, -0.5, 0.5),
      new THREE.Vector3(0.5, -0.5, -0.5),

      // Right line, back face
      new THREE.Vector3(0.5, -0.5, -0.5),
      new THREE.Vector3(0.5, 0.5, -0.5),

      // Top line, back face
      new THREE.Vector3(0.5, 0.5, -0.5),
      new THREE.Vector3(-0.5, 0.5, -0.5),

      // Left line, back face
      new THREE.Vector3(-0.5, 0.5, -0.5),
      new THREE.Vector3(-0.5, -0.5, -0.5),

      // Bottom line, back face
      new THREE.Vector3(-0.5, -0.5, -0.5),
      new THREE.Vector3(0.5, -0.5, -0.5),
    ]);

    return geometry;
  }, []);

  // Store references to each tunnel segment group and its constituent elements (box/plane)
  const tunnelSegments = useRef<THREE.Group[]>([]);
  const tunnelSegmentBoxes = useRef<THREE.LineSegments[]>([]);
  const tunnelSegmentPlanes = useRef<THREE.Mesh[]>([]);
  const tunnelSegmentElements = useMemo(() =>
    generateNumericArray(SEGMENTS_PER_SIDE * 2).map((segmentNum) => {
      // The first half of the segments will be on the left side, the other will be on the right side
      let horizSegment = HORIZ_OFFSET;
      let isSegmentVisible = true;

      if (segmentNum < SEGMENTS_PER_SIDE) {
        horizSegment = -HORIZ_OFFSET;
      }

      // Randomly determine how this segment might appear based on the song - use the segment index as a fake "time"
      const segmentDisplayMode = props.trackAnalysis.getTrackTimeRandomInt(0, 6, segmentNum);

      // Because we want to customize a lot of the properties on the plane mesh based on this mesh, generate it ahead of time
      const planeForSegment = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({ color: fillerColor, side: THREE.DoubleSide }));
      tunnelSegmentPlanes.current[segmentNum] = planeForSegment;
      planeForSegment.visible = true;

      switch(segmentDisplayMode) {
        // 0 - entire segment hidden
        case 0:
          isSegmentVisible = false;
          planeForSegment.visible = false;
          break;

        // 1 - plane visible on the left of the box
        case 1:
          planeForSegment.scale.set(SEGMENT_DEPTH, SEGMENT_HEIGHT, 1);
          planeForSegment.position.set(-SEGMENT_WIDTH / 2, 0, 0);
          planeForSegment.rotation.set(0, QUARTER_TURN, 0);
          break;

        // 2 - plane visible on the right of the box
        case 2:
          planeForSegment.scale.set(SEGMENT_DEPTH, SEGMENT_HEIGHT, 1);
          planeForSegment.position.set(SEGMENT_WIDTH / 2, 0, 0);
          planeForSegment.rotation.set(0, QUARTER_TURN, 0);
          break;

        // 3 - plane visible on the front of the box
        case 3:
          planeForSegment.scale.set(SEGMENT_WIDTH, SEGMENT_HEIGHT, 1);
          planeForSegment.position.set(0, 0, SEGMENT_DEPTH / 2);
          planeForSegment.rotation.set(0, 0, 0);
          break;

        // 4 - plane visible on the top of the box
        case 4:
          planeForSegment.scale.set(SEGMENT_WIDTH, SEGMENT_DEPTH, 1);
          planeForSegment.position.set(0, SEGMENT_HEIGHT / 2, 0);
          planeForSegment.rotation.set(QUARTER_TURN, 0, 0);
          break;

        // 5 - plane visible on the bottom of the box
        case 5:
          planeForSegment.scale.set(SEGMENT_WIDTH, SEGMENT_DEPTH, 1);
          planeForSegment.position.set(0, -SEGMENT_HEIGHT / 2, 0);
          planeForSegment.rotation.set(QUARTER_TURN, 0, 0);
          break;

        // 6 - plane is hidden
        case 6:
          planeForSegment.visible = false;
          break;

        default:
          console.trace(`unexpected display mode: ${segmentDisplayMode} for segment ${segmentNum}`);
          break;
      }

      return <group
        ref={(grp: THREE.Group) => tunnelSegments.current[segmentNum] = grp}
        position={[horizSegment, 0, START_DEPTH - (SEGMENT_DEPTH * (segmentNum % SEGMENTS_PER_SIDE))]}
        visible={isSegmentVisible}
        key={segmentNum}
      >
        <lineSegments
          ref={(seg: THREE.LineSegments) => tunnelSegmentBoxes.current[segmentNum] = seg}
          scale={[SEGMENT_WIDTH, SEGMENT_HEIGHT, SEGMENT_DEPTH]}
        >
          <primitive object={boxLineGeometry} attach='geometry' />
          <lineBasicMaterial color={lineColor} />
        </lineSegments>   
        <primitive object={planeForSegment} />
      </group>
    }),
    [props.trackAnalysis, boxLineGeometry, lineColor, fillerColor]);

  return (
    <group>
      {tunnelSegmentElements}
    </group>
  );
}