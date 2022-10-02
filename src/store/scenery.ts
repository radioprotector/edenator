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
  // CactusShortModel,
  // CactusTallModel,
  // BambooStageAModel,
  // BambooStageBModel,
  // CornStageAModel,
  // CornStageBModel,
  // CornStageCModel,
  // StatueBlockModel,
  // StatueColumnModel,
  // StatueColumnDamagedModel,
  // StatueHeadModel,
  // StatueObeliskModel,
  // StatueRingModel,
  // StoneTallBModel,
  // StoneTallGModel,
  // StoneTallIModel,
  // StumpOldTallModel,
  // TreePalmBendModel,
  // TreePalmTallModel,
  // TreePineRoundAModel,
  // TreePlateauModel,
  // TreeSimpleModel,
  // TreeThinModel
};

/**
 * Maps different available scenery items to their representation.
 */
export const SceneryMap: { [i in SceneryKey]: Scenery } = {
  [SceneryKey.ConePrimitive]: {
    primitive: new THREE.ConeGeometry(SCENERY_RADIUS, SCENERY_RADIUS * 3, undefined, undefined, true)
  },
  [SceneryKey.SphereTopPrimitive]: {
    // / The top half of a sphere - make sure we move it down so it's flush
    primitive: new THREE.SphereGeometry(SCENERY_RADIUS, undefined, undefined, undefined, undefined, 0, Math.PI / 2),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  },
  [SceneryKey.TorusTopPrimitive]: {
    // The top half of a torus - move it down like the sphere and rotate it so it's parallel to the walls
    primitive: new THREE.TorusGeometry(SCENERY_RADIUS, SCENERY_RADIUS / 2, undefined, undefined, Math.PI).rotateY(Math.PI / 2),
    translate: new THREE.Vector2(0, -SCENERY_RADIUS/1.5)
  },
  [SceneryKey.ColumnPrimitive]: {
    // A tall rectangular column
    primitive: new THREE.BoxGeometry(SCENERY_RADIUS, SCENERY_RADIUS * 5, SCENERY_RADIUS)
  },
  [SceneryKey.CylinderPrimitive]: {
    primitive: new THREE.CylinderGeometry(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS * 5, undefined, undefined, true)
  },
  // // Cacti
  // [SceneryKey.CactusShortModel]: {
  //   modelName: 'cactus_short',
  //   translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  // },
  // [SceneryKey.CactusTallModel]: {
  //   modelName: 'cactus_tall',
  //   translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  // },

  // // Bamboo
  // [SceneryKey.BambooStageAModel]: {
  //   modelName: 'crops_bambooStageA',
  //   translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  // },
  // [SceneryKey.BambooStageBModel]: {
  //   modelName: 'crops_bambooStageB',
  //   translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  // },

  // // Corn
  // [SceneryKey.CornStageAModel]: {
  //   modelName: 'crops_cornStageA',
  //   translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  // },
  // [SceneryKey.CornStageBModel]: {
  //   modelName: 'crops_cornStageB',
  //   translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  // },
  // [SceneryKey.CornStageCModel]: {
  //   modelName: 'crops_cornStageC',
  //   translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  // },

  // // Statues
  // [SceneryKey.StatueBlockModel]: {
  //   modelName: 'statue_block',
  //   translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  // },
  // [SceneryKey.StatueColumnModel]: {
  //   modelName: 'statue_column',
  //   translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  // },
  // [SceneryKey.StatueColumnDamagedModel]: {
  //   modelName: 'statue_columnDamaged',
  //   translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  // },
  // [SceneryKey.StatueHeadModel]: {
  //   modelName: 'statue_head',
  //   translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  // },
  // [SceneryKey.StatueObeliskModel]: {
  //   modelName: 'statue_obelisk',
  //   translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  // },
  // [SceneryKey.StatueRingModel]: {
  //   modelName: 'statue_ring',
  //   translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  // },

  // // Stones
  // [SceneryKey.StoneTallBModel]: {
  //   modelName: 'stone_tallB',
  //   translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  // },
  // [SceneryKey.StoneTallGModel]: {
  //   modelName: 'stone_tallG',
  //   translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  // },
  // [SceneryKey.StoneTallIModel]: {
  //   modelName: 'stone_tallI',
  //   translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  // },

  // // Trees/Stumps
  // [SceneryKey.StumpOldTallModel]: {
  //   modelName: 'stump_oldTall',
  //   translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  // },
  // [SceneryKey.TreePalmBendModel]: {
  //   modelName: 'tree_palmBend',
  //   translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  // },
  // [SceneryKey.TreePalmTallModel]: {
  //   modelName: 'tree_palmTall',
  //   translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  // },
  // [SceneryKey.TreePineRoundAModel]: {
  //   modelName: 'tree_pineRoundA',
  //   translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  // },
  // [SceneryKey.TreePlateauModel]: {
  //   modelName: 'tree_plateau',
  //   translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  // },
  // [SceneryKey.TreeSimpleModel]: {
  //   modelName: 'tree_simple',
  //   translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  // },
  // [SceneryKey.TreeThinModel]: {
  //   modelName: 'tree_thin',
  //   translate: new THREE.Vector2(0, -SCENERY_RADIUS/2)
  // }
};

/**
 * Gets the unique collection of model URLs for the specified scenery keys.
 * @param itemKeys The scenery keys to scan for model URLs.
 * @returns A unique collection of model URLs.
 */
export function getSceneryModelUrls(itemKeys: SceneryKey[]): string[] {
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