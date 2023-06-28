const validationSchemas = {
  createRentalUnit: {
    properties: {
      name: {
        type: 'string',
        minLength: 1,
      },
      floorId: { format: 'uuid' },
      type: { type: 'string', minLength: 1 },
    },
    required: ['name', 'type', 'floorId'],
    additionalProperties: false,
  },
  updateRentalUnit: {
    properties: {
      type: { type: 'string', minLength: 1 },
      name: { type: 'string', minLength: 1 },
      id: { format: 'uuid' },
      floorId: { format: 'uuid' },
    },
    required: ['id', 'name', 'type', 'floorId'],
    additionalProperties: false,
  },
  getRentalUnitsByFloorId: {
    properties: {
      floorId: { format: 'uuid' },
    },
    required: ['floorId'],
    additionalProperties: false,
  },
  getRentalUnitsBySocietyId: {
    properties: {
      societyId: { format: 'uuid' },
    },
    required: ['societyId'],
    additionalProperties: false,
  },
  getRentalUnitsByBlockId: {
    properties: {
      blockId: { format: 'uuid' },
    },
    required: ['blockId'],
    additionalProperties: false,
  },
  enableOrDisableRentalUnit: {
    properties: {
      id: { format: 'uuid' },
    },
    required: ['id'],
    additionalProperties: false,
  },
};

export default validationSchemas;
