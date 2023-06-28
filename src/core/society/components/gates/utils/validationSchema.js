const validationSchemas = {
  createGate: {
    properties: {
      name: {
        type: 'string',
        minLength: 1,
      },
    },
    required: ['name'],
    additionalProperties: false,
  },
  updateGate: {
    properties: {
      name: {
        type: 'string',
        minLength: 1,
      },
      gateId: { format: 'uuid' },
    },
    required: ['name', 'gateId'],
    additionalProperties: false,
  },
};

export default validationSchemas;
