import * as THREE from 'three';

/**
 * Describes an item that can be used for scenery.
 */
export interface Scenery {
  /**
   * The geometry primitive that will be used for the item, or null when using a model instead.
   */
  primitive?: THREE.BufferGeometry | null;

  /**
   * The description of the primitive, or null when using a model instead.
   */
  primitiveDesc?: string | null;

  /**
   * The path to the GLTF model that will be used for the item, or null when using a geometry primitive instead.
   */
  modelName?: string | null;

  /**
   * The translation to apply to the model when it is displayed.
   */
  translate?: THREE.Vector2;

  /**
   * The scaling to apply to the scenery when it is displayed.
   */
  scale?: THREE.Vector3;

  /**
   * The rotation to apply to the scenery when it is displayed.
   */
  rotate?: THREE.Euler;
}

/**
 * The base radius to use for scenery geometries.
 */
export const SCENERY_RADIUS = 150;

/**
  * The x-offset to apply from the center for each scenery item.
  */
export const SCENERY_HORIZ_OFFSET = SCENERY_RADIUS * 2.5;
 
/**
  * The y-offset to apply to each scenery item.
  */
export const SCENERY_VERT_OFFSET = -10;
 
/**
 * Describes the range of scenery options that are available.
 */
 export const enum SceneryKey {
  ConePrimitive,
  SphereTopPrimitive,
  TorusTopPrimitive,
  ColumnPrimitive,
  CylinderPrimitive,
  CactusShortModel,
  CactusTallModel,
  BambooStageAModel,
  BambooStageBModel,
  CornStageAModel,
  CornStageBModel,
  CornStageCModel,
  FlowerAModel,
  FlowerBModel,
  FlowerCModel,
  PumpkinModel,
  StatueBlockModel,
  StatueColumnModel,
  StatueColumnDamagedModel,
  StatueObeliskModel,
  StatueRingModel,
  StoneTallBModel,
  StoneTallGModel,
  StoneTallIModel,
  StumpOldTallModel,
  StumpRoundDetailedModel,
  TreeFatModel,
  TreeOakModel,
  TreePalmBendModel,
  TreePalmTallModel,
  TreePineRoundAModel,
  TreePlateauModel,
  TreeSimpleModel,
  TreeThinModel
};

/**
 * Maps different available scenery items to their representation.
 */
export const SceneryMap: { [i in SceneryKey]: Scenery } = {
  [SceneryKey.ConePrimitive]: {
    primitive: new THREE.ConeGeometry(SCENERY_RADIUS, SCENERY_RADIUS * 3, undefined, undefined, true),
    primitiveDesc: 'cone'
  },
  [SceneryKey.SphereTopPrimitive]: {
    // / The top half of a sphere - make sure we move it down so it's flush
    primitive: new THREE.SphereGeometry(SCENERY_RADIUS, undefined, undefined, undefined, undefined, 0, Math.PI / 2),
    primitiveDesc: 'sphere half',
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },
  [SceneryKey.TorusTopPrimitive]: {
    // The top half of a torus - move it down like the sphere and rotate it so it's parallel to the walls
    primitive: new THREE.TorusGeometry(SCENERY_RADIUS, SCENERY_RADIUS / 2, undefined, undefined, Math.PI).rotateY(Math.PI / 2),
    primitiveDesc: 'torus half',
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/1.5)
  },
  [SceneryKey.ColumnPrimitive]: {
    // A tall rectangular column
    primitive: new THREE.BoxGeometry(SCENERY_RADIUS, SCENERY_RADIUS * 5, SCENERY_RADIUS),
    primitiveDesc: 'rect column'
  },
  [SceneryKey.CylinderPrimitive]: {
    primitive: new THREE.CylinderGeometry(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS * 5, undefined, undefined, true),
    primitiveDesc: 'cyl column'
  },
  // Cacti
  [SceneryKey.CactusShortModel]: {
    modelName: 'cactus_short',
    scale: new THREE.Vector3(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },
  [SceneryKey.CactusTallModel]: {
    modelName: 'cactus_tall',
    scale: new THREE.Vector3(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },

  // Bamboo
  [SceneryKey.BambooStageAModel]: {
    modelName: 'crops_bambooStageA',
    scale: new THREE.Vector3(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },
  [SceneryKey.BambooStageBModel]: {
    modelName: 'crops_bambooStageB',
    scale: new THREE.Vector3(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },

  // Corn
  [SceneryKey.CornStageAModel]: {
    modelName: 'crops_cornStageA',
    scale: new THREE.Vector3(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },
  [SceneryKey.CornStageBModel]: {
    modelName: 'crops_cornStageB',
    scale: new THREE.Vector3(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },
  [SceneryKey.CornStageCModel]: {
    modelName: 'crops_cornStageC',
    scale: new THREE.Vector3(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },

  // Flowers - scale up
  [SceneryKey.FlowerAModel]: {
    modelName: 'flower_purpleA',
    scale: new THREE.Vector3(SCENERY_RADIUS * 2, SCENERY_RADIUS * 2, SCENERY_RADIUS * 2),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },
  [SceneryKey.FlowerBModel]: {
    modelName: 'flower_purpleB',
    scale: new THREE.Vector3(SCENERY_RADIUS * 2, SCENERY_RADIUS * 2, SCENERY_RADIUS * 2),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },
  [SceneryKey.FlowerCModel]: {
    modelName: 'flower_purpleC',
    scale: new THREE.Vector3(SCENERY_RADIUS * 2, SCENERY_RADIUS * 2, SCENERY_RADIUS * 2),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },

  // Pumpkin - scale up
  [SceneryKey.PumpkinModel]: {
    modelName: 'crop_pumpkin',
    scale: new THREE.Vector3(SCENERY_RADIUS * 1.5, SCENERY_RADIUS * 1.5, SCENERY_RADIUS * 1.5),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },

  // Statues
  [SceneryKey.StatueBlockModel]: {
    modelName: 'statue_block',
    scale: new THREE.Vector3(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },
  [SceneryKey.StatueColumnModel]: {
    modelName: 'statue_column',
    scale: new THREE.Vector3(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },
  [SceneryKey.StatueColumnDamagedModel]: {
    modelName: 'statue_columnDamaged',
    scale: new THREE.Vector3(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },
  [SceneryKey.StatueObeliskModel]: {
    modelName: 'statue_obelisk',
    scale: new THREE.Vector3(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },
  [SceneryKey.StatueRingModel]: {
    modelName: 'statue_ring',
    scale: new THREE.Vector3(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },

  // Stones
  [SceneryKey.StoneTallBModel]: {
    modelName: 'stone_tallB',
    scale: new THREE.Vector3(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },
  [SceneryKey.StoneTallGModel]: {
    modelName: 'stone_tallG',
    scale: new THREE.Vector3(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2),
    rotate: new THREE.Euler(0, Math.PI, 0) // Rotate 180 degrees to face the viewer
  },
  [SceneryKey.StoneTallIModel]: {
    modelName: 'stone_tallI',
    scale: new THREE.Vector3(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2),
    rotate: new THREE.Euler(0, Math.PI, 0) // Rotate 180 degrees to face the viewer
  },

  // Trees/Stumps
  [SceneryKey.StumpOldTallModel]: {
    modelName: 'stump_oldTall',
    scale: new THREE.Vector3(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2),
    rotate: new THREE.Euler(0, Math.PI, 0) // Rotate 180 degrees to face the viewer
  },
  [SceneryKey.StumpRoundDetailedModel]: {
    modelName: 'stump_roundDetailed',
    scale: new THREE.Vector3(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },
  [SceneryKey.TreeFatModel]: {
    modelName: 'tree_fat',
    scale: new THREE.Vector3(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },
  [SceneryKey.TreeOakModel]: {
    modelName: 'tree_oak',
    scale: new THREE.Vector3(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },
  [SceneryKey.TreePalmBendModel]: {
    modelName: 'tree_palmBend',
    scale: new THREE.Vector3(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },
  [SceneryKey.TreePalmTallModel]: {
    modelName: 'tree_palmTall',
    scale: new THREE.Vector3(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },
  [SceneryKey.TreePineRoundAModel]: {
    modelName: 'tree_pineRoundA',
    scale: new THREE.Vector3(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },
  [SceneryKey.TreePlateauModel]: {
    modelName: 'tree_plateau',
    scale: new THREE.Vector3(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },
  [SceneryKey.TreeSimpleModel]: {
    modelName: 'tree_simple',
    scale: new THREE.Vector3(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },
  [SceneryKey.TreeThinModel]: {
    modelName: 'tree_thin',
    scale: new THREE.Vector3(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  }
};

/**
 * A collection of keys for scenery backed only by geometric primitives.
 */
export const GeometricScenery: readonly SceneryKey[] = [
  SceneryKey.ColumnPrimitive,
  SceneryKey.ConePrimitive,
  SceneryKey.CylinderPrimitive,
  SceneryKey.SphereTopPrimitive,
  SceneryKey.TorusTopPrimitive
];

/**
 * Gets the unique collection of model URLs for the specified scenery keys.
 * @param itemKeys The scenery keys to scan for model URLs.
 * @returns A unique collection of model URLs.
 */
export function getSceneryModelUrls(itemKeys: readonly SceneryKey[]): string[] {
  const encounteredUrls = new Set<string>();
  const modelUrls = [];

  for(const itemKey of itemKeys) {
    const item = SceneryMap[itemKey];

    if (item.modelName && encounteredUrls.add(item.modelName)) {
      modelUrls.push(process.env.PUBLIC_URL + '/models/' + item.modelName + '.glb');
    }
  }

  return modelUrls;
}
