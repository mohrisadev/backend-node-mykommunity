const validationSchemas = {
  createAdvertisement: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2 },
      imageUrl: { format: 'uri' },
      redirectUrl: { format: 'uri' },
    },
    required: ['name', 'imageUrl', 'redirectUrl'],
    additionalProperties: false,
  },
  updateAdvertisement: {
    type: 'object',
    properties: {
      advertisementId: { format: 'uuid' },
      name: { type: 'string', minLength: 2 },
      imageUrl: { format: 'uri' },
      redirectUrl: { format: 'uri' },
    },
    required: ['advertisementId'],
    additionalProperties: false,
  },
  deleteAdvertisement: {
    type: 'object',
    properties: {
      advertisementId: { format: 'uuid' },
    },
    required: ['advertisementId'],
    additionalProperties: false,
  },
};

export default validationSchemas;
