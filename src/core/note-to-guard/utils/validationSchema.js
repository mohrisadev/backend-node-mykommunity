const validationSchemas = {
  createNote: {
    properties: {
      note: {
        type: 'string',
        minLength: 1,
      },
      attachment: { format: 'uri' },
      image: { format: 'uri' },
    },
    required: ['note'],
    additionalProperties: false,
  },
  deleteNote: {
    properties: {
      noteId: {
        format: 'uuid',
      },
    },
    required: ['noteId'],
    additionalProperties: false,
  },
};

export default validationSchemas;
