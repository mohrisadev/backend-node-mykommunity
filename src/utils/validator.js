import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import ajvErrors from 'ajv-errors';

const ajv = new Ajv({
  allErrors: true,
  jsonPointers: true,
  schemaId: 'auto',
});
addFormats(ajv);

ajvErrors(ajv, { singleError: true });

ajv.addFormat('password', (password) => {
  const passwordRegex =
    /^(?=.*[A-Za-z])(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&;:`><{},]{8,}$/;

  return passwordRegex.test(String(password));
});

class ValidationError extends Error {
  constructor({ message = 'Invalid form data', info, schema }) {
    super(message);
    this.name = 'ValidationError';
    this.schema = schema;
    this.message = message;
    this.info = info;
  }
}

export const requestValidator = (data, schema) => {
  /**
   * We can use this function with multiple schemas, schemas are defined in validationSchema.js
   */
  const validate = ajv.compile(schema);
  const valid = validate(data);

  let customError = validate.errors;

  if (customError)
    customError = customError.map((item) => {
      return {
        message: item.message,
        path: item.dataPath,
      };
    });

  if (!valid)
    throw new ValidationError({
      message: 'Invalid form data',
      info: customError,
      schema,
    });

  return true;
};
