import { Router } from 'express';
import { USER_ROLES } from '../../../constants.js';
import { KNEX, TABLES } from '../../../services/knex.js';
import { requestValidator } from '../../../utils/validator.js';
import validationSchemas from '../utils/validationSchema.js';

const router = Router();

router.post('/add-staff', async (req, res) => {
  try {
    requestValidator(req.body, validationSchemas.addStaff);

    const {
      societyId,
      email,
      role,
      mobileNumber,
      firstName,
      lastName,
      middleName,
    } = req.body;

    if (role === USER_ROLES.SUPER_ADMIN || role === USER_ROLES.SECURITY_GUARD) {
      throw new Error('Invalid permission');
    }

    const [society] = await KNEX(TABLES.Societies).where({ id: societyId });

    if (!society) throw new Error('Invalid society');

    const [user] = await KNEX(TABLES.Users)
      .where({ email })
      .orWhere({ mobileNumber });

    if (user) {
      const [userRole] = await KNEX(TABLES.UserRoles).where({
        userId: user.id,
        role,
        societyId,
      });

      if (userRole) throw Error('Role already assigned to user');

      await KNEX(TABLES.UserRoles).insert({ userId: user.id, role, societyId });
    } else {
      const [createdUser] = await KNEX(TABLES.Users)
        .insert({ email, mobileNumber, firstName, middleName, lastName })
        .returning(['email', 'id']);

      await KNEX(TABLES.UserRoles).insert({
        userId: createdUser.id,
        role: USER_ROLES[role],
        societyId,
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.log(`Error in adding staff: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/toggle-user', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      throw new Error('Invalid User ID');
    }

    if (userId === req.user.id) throw Error('Invalid User ID');

    const [user] = await KNEX(TABLES.Users).where({ id: userId });

    if (!user) throw new Error('Invalid User');

    if (user.disabled) {
      await KNEX(TABLES.Users)
        .where({ id: userId })
        .update({ disabled: false });

      return res.json({ success: true, message: 'User unblocked' });
    } else {
      await KNEX(TABLES.Users).where({ id: userId }).update({ disabled: true });

      return res.json({ success: true, message: 'User blocked' });
    }
  } catch (error) {
    console.log(
      `Error while updating activity status of user: ${req.body?.userId} | ${error.message}`,
    );

    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/list', async (req, res) => {
  try {
    const users = await KNEX(TABLES.UserRoles)
      .leftJoin(
        TABLES.Users,
        `${TABLES.UserRoles}.userId`,
        `${TABLES.Users}.id`,
      )
      .leftJoin(
        TABLES.Societies,
        `${TABLES.Societies}.id`,
        `${TABLES.UserRoles}.societyId`,
      )
      .leftJoin(
        TABLES.Cities,
        `${TABLES.Cities}.id`,
        `${TABLES.Societies}.cityId`,
      )
      .select([
        `${TABLES.Users}.id as userId`,
        `${TABLES.Users}.firstName`,
        `${TABLES.Users}.lastName`,
        `${TABLES.Users}.email`,
        `${TABLES.Users}.mobileNumber`,

        `${TABLES.UserRoles}.role`,
        `${TABLES.UserRoles}.id as userRoleId`,

        `${TABLES.Societies}.name as societyName`,
        `${TABLES.Societies}.pinCode as societyPinCode`,
        `${TABLES.Societies}.address as societyAddress`,

        `${TABLES.Cities}.id as cityId`,
        `${TABLES.Cities}.name as cityName`,
      ])
      .orderBy('role')
      .whereIn('role', [USER_ROLES.SOCIETY_ADMIN, USER_ROLES.SUPER_ADMIN]);

    return res.json({ success: true, data: users });
  } catch (error) {
    console.log(
      `Error while fetching all admins and super admins list: ${req.body?.userId} | ${error.message}`,
    );

    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
