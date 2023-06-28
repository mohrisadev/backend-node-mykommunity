const validationSchemas = {
  createFloor: {
    properties: {
      name: { type: 'string', minLength: 1 },
      blockId: { format: 'uuid' },
    },
    required: ['name', 'blockId'],
    additionalProperties: false,
  },
  updateFloor: {
    properties: {
      id: { format: 'uuid' },
      name: { type: 'string', minLength: 1 },
      blockId: { format: 'uuid' },
    },
    required: ['id', 'name', 'blockId'],
    additionalProperties: false,
  },
  getFloorsByBlockId: {
    properties: {
      blockId: { format: 'uuid' },
    },
    required: ['blockId'],
    additionalProperties: false,
  },
  getFloorsBySocietyId: {
    properties: {
      societyId: { format: 'uuid' },
    },
    required: ['societyId'],
    additionalProperties: false,
  },
  enableOrDisableFloor: {
    properties: {
      id: { format: 'uuid' },
    },
    required: ['id'],
    additionalProperties: false,
  },
};

export default validationSchemas;
