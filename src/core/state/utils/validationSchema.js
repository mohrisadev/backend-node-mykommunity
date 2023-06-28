const validationSchemas = {
  createState: {
    properties: {
      name: { type: 'string', minLength: 3 },
    },
    required: ['name'],
    additionalProperties: false,
  },
  updateState: {
    properties: {
      name: { type: 'string', minLength: 3 },
      id: { format: 'uuid' },
    },
    required: ['id', 'name'],
    additionalProperties: false,
  },
  enableOrDisableState: {
    properties: {
      id: { format: 'uuid' },
    },
    required: ['id'],
    additionalProperties: false,
  },
};

export default validationSchemas;
