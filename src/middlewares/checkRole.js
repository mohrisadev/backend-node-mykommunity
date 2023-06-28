import { USER_ROLES, USER_ROLES_APPROVAL_STATUS } from '../constants.js';
import { KNEX, TABLES } from '../services/knex.js';

export const checkRole = (allowedRoles) => async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false });
    }

    const { user } = req;

    const [disabledUser] = await KNEX(TABLES.Users)
      .where({
        id: user.id,
        disabled: true,
      })
      .limit(1);

    if (disabledUser) {
      return res.status(400).json({
        success: false,
        message: 'Account disabled',
      });
    }

    const roles = await KNEX(TABLES.UserRoles).where({ userId: user.id });

    if (user && roles.length > 0) {
      for (let i = 0; i < roles.length; i++) {
        const { role, status } = roles[i];
        if (allowedRoles.includes(role)) {
          if (
            role === USER_ROLES.RESIDENT &&
            status !== USER_ROLES_APPROVAL_STATUS.APPROVED
          ) {
            return res.status(403).json({
              success: false,
              message: `You can't access this feature`,
            });
          }

          return next();
        }
      }

      return res.status(403).json({
        success: false,
        message: `You can't access this feature`,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid user roles',
      });
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};
