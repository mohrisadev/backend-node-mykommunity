const validationSchemas = {
  createNotice: {
    properties: {
      title: { type: 'string', minLength: 1 },
      description: { type: 'string', minLength: 1 },
      image: { format: 'uri' },
    },
    required: ['title', 'description'],
    additionalProperties: false,
  },
  updateNotice: {
    properties: {
      noticeId: { format: 'uuid' },
      title: { type: 'string', minLength: 1 },
      description: { type: 'string', minLength: 1 },
      image: { format: 'uri' },
    },
    required: ['noticeId'],
    additionalProperties: false,
  },
  deleteNotice: {
    properties: {
      noticeId: { format: 'uuid' },
    },
    required: ['noticeId'],
    additionalProperties: false,
  },
};

export default validationSchemas;
