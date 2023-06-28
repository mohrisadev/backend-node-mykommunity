const validationSchemas = {
  createCity: {
    properties: {
      name: { type: 'string', minLength: 2 },
      stateId: { format: 'uuid' },
    },
    required: ['name', 'stateId'],
    additionalProperties: false,
  },
  updateCity: {
    properties: {
      name: { type: 'string', minLength: 2 },
      id: { format: 'uuid' },
      stateId: { format: 'uuid' },
    },
    required: ['id', 'name', 'stateId'],
    additionalProperties: false,
  },
  getCitiesByStateId: {
    properties: {
      stateId: { format: 'uuid' },
    },
    required: ['stateId'],
    additionalProperties: false,
  },
  enableOrDisableCity: {
    properties: {
      id: { format: 'uuid' },
    },
    required: ['id'],
    additionalProperties: false,
  },
};

export default validationSchemas;
