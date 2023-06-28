const validationSchemas = {
  createSociety: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 3 },
      cityId: { format: 'uuid' },
      pinCode: { type: 'number', minimum: 100000, maximum: 999999 },
      builderName: { type: 'string', minLength: 2 },
      address: { type: 'string', minLength: 3 },
      images: {
        type: 'array',
        items: { format: 'uri' },
      },
    },
    required: ['name', 'cityId', 'pinCode', 'address', 'builderName', 'images'],
    additionalProperties: false,
  },
  updateSociety: {
    properties: {
      name: { type: 'string', minLength: 3 },
      id: { format: 'uuid' },
      pinCode: { type: 'number', minimum: 100000, maximum: 999999 },
      builderName: { type: 'string', minLength: 2 },
      address: { type: 'string', minLength: 3 },
    },
    required: ['id', 'name', 'pinCode', 'address', 'builderName'],
    additionalProperties: false,
  },
  getSocietiesByCityId: {
    properties: {
      cityId: { format: 'uuid' },
    },
    required: ['cityId'],
    additionalProperties: false,
  },
  enableOrDisableSociety: {
    properties: {
      id: { format: 'uuid' },
    },
    required: ['id'],
    additionalProperties: false,
  },
};

export default validationSchemas;
