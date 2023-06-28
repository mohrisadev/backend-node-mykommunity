import { REQUEST_VALIDATOR_MODIFICATIONS } from '../constants.js';
import { requestValidator } from './validator.js';

const modifyInput = (input, modification) => {
  if (!Object.keys(REQUEST_VALIDATOR_MODIFICATIONS).includes(modification)) {
    throw new Error('Invalid modification provided');
  }

  switch (modification) {
    case REQUEST_VALIDATOR_MODIFICATIONS.TRIM:
      return input.trim();
    case REQUEST_VALIDATOR_MODIFICATIONS.UPPERCASE:
      return input.toUpperCase();
    default:
      break;
  }
};

export const sanitizeAndValidateRequest = (
  data,
  schema,
  { BEFORE_VALIDATION, AFTER_VALIDATION },
) => {
  if (BEFORE_VALIDATION) {
    Object.keys(BEFORE_VALIDATION).forEach((key) => {
      BEFORE_VALIDATION[key].forEach((modification) => {
        data[key] = modifyInput(data[key], modification);
      });
    });
  }

  requestValidator(data, schema);

  if (AFTER_VALIDATION) {
    Object.keys(AFTER_VALIDATION).forEach((key) => {
      AFTER_VALIDATION[key].forEach((modification) => {
        data[key] = modifyInput(modification);
      });
    });
  }

  return true;
};
