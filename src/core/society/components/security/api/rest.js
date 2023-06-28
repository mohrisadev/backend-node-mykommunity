import { Router } from 'express';
import {
  REQUEST_VALIDATOR_MODIFICATIONS,
  USER_ROLES,
} from '../../../../../constants.js';
import { checkRole } from '../../../../../middlewares/checkRole.js';
import { KNEX, TABLES } from '../../../../../services/knex.js';
import { sanitizeAndValidateRequest } from '../../../../../utils/sanitize.js';
import validationSchema from '../utils/validationSchema.js';

const router = Router();

router.post(
  '/',
  checkRole([USER_ROLES.SOCIETY_ADMIN]),
  async ({ user, body }, res) => {
    try {
      sanitizeAndValidateRequest(body, validationSchema.addSecurity, {
        BEFORE_VALIDATION: {
          guardCode: [
            REQUEST_VALIDATOR_MODIFICATIONS.TRIM,
            REQUEST_VALIDATOR_MODIFICATIONS.UPPERCASE,
          ],
        },
      });

      const { guardCode, email, mobileNumber, firstName, lastName, gateId } =
        body;

      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({
          userId: user.id,
          role: USER_ROLES.SOCIETY_ADMIN,
        })
        .limit(1);

      if (!userRole?.societyId) throw new Error('User not linked to society');

      const isNumberTakenPromise = KNEX(TABLES.Users)
        .where({ mobileNumber })
        .limit(1)
        .select('id');

      const isGuardCodeTakenPromise = KNEX(TABLES.UserRoles)
        .where({
          guardCode,
          societyId: userRole?.societyId,
        })
        .limit(1)
        .select('id');

      const isValidGatePromise = KNEX(TABLES.Gates)
        .where({ id: gateId })
        .limit(1);

      const [[isNumberTaken], [isGuardCodeTaken], [isValidGate]] =
        await Promise.all([
          isNumberTakenPromise,
          isGuardCodeTakenPromise,
          isValidGatePromise,
        ]);

      if (!isValidGate) throw new Error('Invalid gate selected');

      if (isNumberTaken) {
        throw new Error('mobile number not available');
      }

      if (isGuardCodeTaken) throw new Error('guard code not available');

      // create security
      const [createdUser] = await KNEX(TABLES.Users)
        .insert({ email, mobileNumber, firstName, lastName })
        .returning(['email', 'id']);

      await KNEX(TABLES.UserRoles).insert({
        userId: createdUser.id,
        role: USER_ROLES.SECURITY_GUARD,
        societyId: userRole?.societyId,
        guardCode,
        guardGateId: gateId,
      });

      return res.json({ success: true, message: 'Security guard created' });
    } catch (error) {
      console.log(`Error in adding security: ${error.message}`);
      return res
        .status(500)
        .json({ success: false, message: error.message, info: error?.info });
    }
  },
);

router.get(
  '/',
  checkRole([USER_ROLES.SOCIETY_ADMIN]),
  async ({ user }, res) => {
    try {
      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({
          userId: user.id,
          role: USER_ROLES.SOCIETY_ADMIN,
        })
        .limit(1);

      if (!userRole?.societyId) throw new Error('User not linked to society');

      const guards = await KNEX(TABLES.UserRoles)
        .select([
          `${TABLES.Users}.id`,
          `${TABLES.Users}.firstName`,
          `${TABLES.Users}.lastName`,
          `${TABLES.Users}.mobileNumber`,
          `${TABLES.Users}.email`,
          `${TABLES.UserRoles}.role`,
          `${TABLES.UserRoles}.guardCode`,
          `${TABLES.Gates}.name as gateName`,
        ])
        .innerJoin(
          TABLES.Users,
          `${TABLES.Users}.id`,
          `${TABLES.UserRoles}.userId`,
        )
        .innerJoin(
          TABLES.Gates,
          `${TABLES.Gates}.id`,
          `${TABLES.UserRoles}.guardGateId`,
        )
        .where({
          role: USER_ROLES.SECURITY_GUARD,
          [`${TABLES.UserRoles}.societyId`]: userRole?.societyId,
        });

      return res.json({ success: true, data: guards });
    } catch (error) {
      console.log(`Error in fetching security: ${error.message}`);
      return res
        .status(500)
        .json({ success: false, message: error.message, info: error?.info });
    }
  },
);

router.post(
  '/verify',
  checkRole([USER_ROLES.SECURITY_GUARD]),
  async ({ user, body }, res) => {
    try {
      sanitizeAndValidateRequest(body, validationSchema.verifyGuardCode, {
        BEFORE_VALIDATION: {
          guardCode: [
            REQUEST_VALIDATOR_MODIFICATIONS.TRIM,
            REQUEST_VALIDATOR_MODIFICATIONS.UPPERCASE,
          ],
        },
      });

      const { guardCode } = body;

      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({
          userId: user.id,
          guardCode,
        })
        .limit(1)
        .select('id');

      if (!userRole) {
        throw new Error('Invalid guard code');
      }

      return res.json({ success: true, message: 'Security guard verified' });
    } catch (error) {
      console.log(`Error in verifying security: ${error.message}`);
      return res
        .status(500)
        .json({ success: false, message: error.message, info: error?.info });
    }
  },
);

export default router;
