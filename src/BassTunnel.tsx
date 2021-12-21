import { RefObject, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

import { generateNumericArray } from './Utils';
import { TrackAnalysis } from './TrackAnalysis';

const QUARTER_TURN = Math.PI / 2;

const SEGMENT_DEPTH = 5;
const SEGMENT_WIDTH = 2;
const SEGMENT_HEIGHT = 15;

const SEGMENTS_PER_SIDE = 20;
const START_DEPTH = SEGMENT_DEPTH;

const enum SegmentDisplay {
  SegmentHidden = 0,
  MIN = SegmentHidden,
  PlaneLeft = 1,
  PlaneRight = 2,
  PlaneFront = 3,
  PlaneTop = 4,
  PlaneBottom = 5,
  PlaneHidden = 6,
  MAX = PlaneHidden
}

/**
 * Randomizes the presentation of the provided tunnel segment based on the current track and time.
 * @param segmentIndex The index of the segment.
 * @param segment The group containing the wireframe box and the filler plane.
 * @param planeForSegment The mesh for the filler plane.
 * @param trackAnalysis The track information.
 * @param currentTrackTime The current track time.
 */
function randomizeTunnelSegment(segmentIndex: number, segment: THREE.Group, planeForSegment: THREE.Mesh, trackAnalysis: TrackAnalysis, currentTrackTime: number): void {
  // In most cases both the segment and filler plane will be visible, so default those.
  segment.visible = true;
  planeForSegment.visible = true;

  // Randomly determine how this segment might appear based on the current time.
  // If we're changing two segments in the same frame, we might run into overlap, 
  // and so it's a good idea to also incorporate the segment index so there are still variances
  let segmentDisplayMode: SegmentDisplay;
  
  if (!trackAnalysis.isEmpty) {
    segmentDisplayMode = trackAnalysis.getTrackSeededRandomInt(SegmentDisplay.MIN, SegmentDisplay.MAX, currentTrackTime + segmentIndex);
  }
  else {
    segmentDisplayMode = SegmentDisplay.PlaneHidden;
  }

  switch(segmentDisplayMode) {
    case SegmentDisplay.SegmentHidden:
      segment.visible = false;
      planeForSegment.visible = false;
      break;

    case SegmentDisplay.PlaneLeft:
      planeForSegment.scale.set(SEGMENT_DEPTH, SEGMENT_HEIGHT, 1);
      planeForSegment.position.set(-SEGMENT_WIDTH / 2, 0, 0);
      planeForSegment.rotation.set(0, QUARTER_TURN, 0);
      break;

    case SegmentDisplay.PlaneRight:
      planeForSegment.scale.set(SEGMENT_DEPTH, SEGMENT_HEIGHT, 1);
      planeForSegment.position.set(SEGMENT_WIDTH / 2, 0, 0);
      planeForSegment.rotation.set(0, QUARTER_TURN, 0);
      break;

    case SegmentDisplay.PlaneFront:
      planeForSegment.scale.set(SEGMENT_WIDTH, SEGMENT_HEIGHT, 1);
      planeForSegment.position.set(0, 0, SEGMENT_DEPTH / 2);
      planeForSegment.rotation.set(0, 0, 0);
      break;

    case SegmentDisplay.PlaneTop:
      planeForSegment.scale.set(SEGMENT_WIDTH, SEGMENT_DEPTH, 1);
      planeForSegment.position.set(0, SEGMENT_HEIGHT / 2, 0);
      planeForSegment.rotation.set(QUARTER_TURN, 0, 0);
      break;

    case SegmentDisplay.PlaneBottom:
      planeForSegment.scale.set(SEGMENT_WIDTH, SEGMENT_DEPTH, 1);
      planeForSegment.position.set(0, -SEGMENT_HEIGHT / 2, 0);
      planeForSegment.rotation.set(QUARTER_TURN, 0, 0);
      break;

    case SegmentDisplay.PlaneHidden:
      planeForSegment.visible = false;
      break;

    default:
      console.trace(`unexpected display mode: ${segmentDisplayMode} for segment ${segmentIndex}`);
      break;
  }
}

function getDepthForSegment(segmentIndex: number): number {
  return START_DEPTH - (SEGMENT_DEPTH * (segmentIndex % SEGMENTS_PER_SIDE))
}

function BassTunnel(props: { audio: RefObject<HTMLAudioElement>, audioLastSeeked: number, trackAnalysis: TrackAnalysis }): JSX.Element {
  const HORIZ_OFFSET = 10;

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

  const tunnelSegmentElements = useMemo(() => {
    const lineColor = new THREE.Color(0x8f074b);
    const fillerColor = new THREE.Color(0x850707);

    return generateNumericArray(SEGMENTS_PER_SIDE * 2)
      .map((segmentIndex) => {
        return <group
          ref={(grp: THREE.Group) => tunnelSegments.current[segmentIndex] = grp}
          key={segmentIndex}
        >
          <lineSegments
            ref={(seg: THREE.LineSegments) => tunnelSegmentBoxes.current[segmentIndex] = seg}
            scale={[SEGMENT_WIDTH, SEGMENT_HEIGHT, SEGMENT_DEPTH]}
          >
            <primitive object={boxLineGeometry} attach='geometry' />
            <lineBasicMaterial color={lineColor} />
          </lineSegments>   
          <mesh
            ref={(plane: THREE.Mesh) => tunnelSegmentPlanes.current[segmentIndex] = plane}
          >
            <planeGeometry />
            <meshBasicMaterial color={fillerColor} side={THREE.DoubleSide} transparent={true} opacity={0.5} />
          </mesh>
        </group>
      });
    }, [boxLineGeometry]);

  // Determine the amount of time it should take for a segment to scroll the length of the tunnel
  const tunnelTraversalPeriodSeconds = useMemo(() => {
      return props.trackAnalysis.secondsPerMeasure * 0.5 * SEGMENTS_PER_SIDE;
    },
    [props.trackAnalysis]);

  // Reset the initial arrangement when the track analysis changes
  useEffect(() => {
    for(let segmentIndex = 0; segmentIndex < tunnelSegments.current.length; segmentIndex++) {
      const groupForSegment = tunnelSegments.current[segmentIndex];
      const planeForSegment = tunnelSegmentPlanes.current[segmentIndex];

      // Position the overall group for the segment.
      // The first half of the segments will be on the left side, the remainder will be on the right
      // Each half will be positioned one behind the other
      const segmentDepth = getDepthForSegment(segmentIndex);

      if (segmentIndex < SEGMENTS_PER_SIDE) {
        groupForSegment.position.set(-HORIZ_OFFSET, 0, segmentDepth);
      }
      else {
        groupForSegment.position.set(HORIZ_OFFSET, 0, segmentDepth);
      }

      // Randomize the presentation for initial display
      randomizeTunnelSegment(segmentIndex, groupForSegment, planeForSegment, props.trackAnalysis, 0); 
    }
  }, [props.trackAnalysis, tunnelSegments, tunnelSegmentPlanes]);

  useFrame(() => {
    // Determine the depth offset to apply to all segments
    const TOTAL_DEPTH = SEGMENT_DEPTH * SEGMENTS_PER_SIDE;
    const WRAP_DEPTH = getDepthForSegment(0) + (2 * SEGMENT_DEPTH);
    let timeDepthOffset = 0;
    let currentTrackTime = 0;

    if (props.audio.current !== null) {
      currentTrackTime = props.audio.current.currentTime;
      timeDepthOffset = TOTAL_DEPTH * (currentTrackTime % tunnelTraversalPeriodSeconds) / tunnelTraversalPeriodSeconds;
    }

    for(let segmentIndex = 0; segmentIndex < tunnelSegments.current.length; segmentIndex++) {
      const segment = tunnelSegments.current[segmentIndex];
      let segmentDepth = getDepthForSegment(segmentIndex) + timeDepthOffset;

      // Wrap the group if it's past the camera
      if (segmentDepth > WRAP_DEPTH) {
        segmentDepth -= TOTAL_DEPTH;

        // If this is the first time we've had to re-position the wrapped element, randomize the segment's appearance
        if (segmentDepth < segment.position.z) {
          const planeForSegment = tunnelSegmentPlanes.current[segmentIndex];
          randomizeTunnelSegment(segmentIndex, segment, planeForSegment, props.trackAnalysis, currentTrackTime);
        }
      }

      segment.position.z = segmentDepth;
    }
  })

  return (
    <group>
      {tunnelSegmentElements}
    </group>
  );
}

export default BassTunnel;
