import { Router } from 'express';
import {
  USER_ROLES,
  USER_ROLES_APPROVAL_STATUS,
} from '../../../../../constants.js';
import { checkRole } from '../../../../../middlewares/checkRole.js';
import { KNEX, TABLES } from '../../../../../services/knex.js';
import { requestValidator } from '../../../../../utils/validator.js';
import validationSchemas from '../utils/validationSchema.js';

const router = Router();

router.post('/apply', async (req, res) => {
  try {
    requestValidator(req.body, validationSchemas.applyForMembership);

    const { rentalUnitId } = req.body;

    const hasUserAlreadyAppliedPromise = KNEX(TABLES.UserRoles).where({
      rentalUnitId,
      role: USER_ROLES.RESIDENT,
      userId: req.user.id,
    });

    // const hasSomeoneElseAlreadyAppliedPromise = KNEX(TABLES.UserRoles)
    //   .where({
    //     rentalUnitId,
    //     role: USER_ROLES.RESIDENT,
    //   })
    //   .andWhereNot({
    //     userId: req.user.id,
    //   });

    const [
      [hasUserAlreadyApplied],
      // [hasSomeoneElseAlreadyApplied]
    ] = await Promise.all([
      hasUserAlreadyAppliedPromise,
    //   hasSomeoneElseAlreadyAppliedPromise,
    ]);

    if (hasUserAlreadyApplied) {
      if (
        hasUserAlreadyApplied.status === USER_ROLES_APPROVAL_STATUS.REJECTED
      ) {
        return res.status(400).json({
          success: false,
          message: `Membership was rejected, reach out to the society admin if you think that's a mistake`,
        });
      }

      if (hasUserAlreadyApplied.status === USER_ROLES_APPROVAL_STATUS.PENDING) {
        return res
          .status(400)
          .json({ success: false, message: 'Already applied for membership' });
      }

      return res
        .status(400)
        .json({ success: false, message: 'Already a member' });
    }

    // if (hasSomeoneElseAlreadyApplied) {
    //   if (
    //     hasSomeoneElseAlreadyApplied.status ===
    //     USER_ROLES_APPROVAL_STATUS.APPROVED
    //   ) {
    //     return res.status(400).json({
    //       success: false,
    //       message: 'Someone else is already a member, ask them to add you',
    //     });
    //   }
    // }

    const [rentalUnit] = await KNEX(TABLES.RentalUnits)
      .where({
        id: rentalUnitId,
      })
      .select('societyId')
      .limit(1);

    if (!rentalUnit) throw new Error('Invalid rental unit');

    const [{ id: userRoleId }] = await KNEX(TABLES.UserRoles)
      .insert({
        userId: req.user.id,
        role: USER_ROLES.RESIDENT,
        status: USER_ROLES_APPROVAL_STATUS.PENDING,
        rentalUnitId,
        societyId: rentalUnit?.societyId,
      })
      .returning('id');

    await KNEX(TABLES.UserRoleStatus).insert({
      name: USER_ROLES_APPROVAL_STATUS.PENDING,
      userRoleId,
      message: 'User applied for membership',
    });

    return res.json({
      success: true,
      message: 'Requested for membership successfully',
    });
  } catch (error) {
    console.log(`Error in applying user membership: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post(
  '/approve',
  checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.SOCIETY_ADMIN]),
  async (req, res) => {
    try {
      requestValidator(req.body, validationSchemas.approveMembership);

      const { userRoleId } = req.body;

      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({
          role: USER_ROLES.RESIDENT,
          id: userRoleId,
        })
        .andWhereNot('status', '=', USER_ROLES_APPROVAL_STATUS.APPROVED);

      if (!userRole) {
        return res.status(400).json({
          success: false,
          message: `User was already approved`,
        });
      }

      const [isOwnerPresent] = await KNEX(TABLES.UserRoles)
        .where({
          societyId: userRole.societyId,
          isOwner: true,
        })
        .limit(1);

      const approveMembershipPromise = KNEX(TABLES.UserRoles)
        .where({
          role: USER_ROLES.RESIDENT,
          id: userRoleId,
        })
        .update({
          status: USER_ROLES_APPROVAL_STATUS.APPROVED,
          isOwner: !isOwnerPresent,
        });

      const addStatusPromise = KNEX(TABLES.UserRoleStatus).insert({
        userRoleId: userRoleId,
        name: USER_ROLES_APPROVAL_STATUS.APPROVED,
        message: `Membership approved by ${req.user.id}`,
      });

      await Promise.all([approveMembershipPromise, addStatusPromise]);

      return res.json({
        success: true,
        message: 'Membership approved successfully',
      });
    } catch (error) {
      console.log(`Error while approving Resident: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  },
);

router.post(
  '/add',
  checkRole([USER_ROLES.RESIDENT]),
  async ({ user, body }, res) => {
    try {
      requestValidator(body, validationSchemas.addMembers);

      const { mobileNumber } = body;

      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({
          userId: user.id,
          role: USER_ROLES.RESIDENT,
        })
        .limit(1);

      if (!userRole?.rentalUnitId) {
        throw new Error('User not linked to any rental unit');
      }

      const [userViaMobileNumber] = await KNEX(TABLES.Users)
        .where({ mobileNumber })
        .limit(1)
        .select('id');

      if (!userViaMobileNumber) {
        // new user
        const [newUser] = await KNEX(TABLES.Users)
          .insert({
            mobileNumber,
          })
          .returning('id');

        const [{ id: userRoleId }] = await KNEX(TABLES.UserRoles)
          .insert({
            userId: newUser.id,
            role: USER_ROLES.RESIDENT,
            status: USER_ROLES_APPROVAL_STATUS.APPROVED,
            rentalUnitId: userRole.rentalUnitId,
            societyId: userRole?.societyId,
          })
          .returning('id');

        await KNEX(TABLES.UserRoleStatus).insert({
          name: USER_ROLES_APPROVAL_STATUS.APPROVED,
          userRoleId,
          message: `User added by existing member with id - ${user.id}`,
        });
      } else {
        // existing user
        const [isNewUserAssociatedWithRentalUnit] = await KNEX(TABLES.UserRoles)
          .where({
            userId: userViaMobileNumber.id,
            role: USER_ROLES.RESIDENT,
          })
          .limit(1);

        if (
          isNewUserAssociatedWithRentalUnit.rentalUnitId ===
          userRole.rentalUnitId
        ) {
          return res.json({ success: true, message: 'User already exists' });
        }

        if (isNewUserAssociatedWithRentalUnit) {
          throw new Error('User already linked to another rental unit');
        }

        const [{ id: userRoleId }] = await KNEX(TABLES.UserRoles)
          .insert({
            userId: userViaMobileNumber.id,
            role: USER_ROLES.RESIDENT,
            status: USER_ROLES_APPROVAL_STATUS.APPROVED,
            rentalUnitId: userRole.rentalUnitId,
            societyId: userRole?.societyId,
          })
          .returning('id');

        await KNEX(TABLES.UserRoleStatus).insert({
          name: USER_ROLES_APPROVAL_STATUS.APPROVED,
          userRoleId,
          message: `User added by existing member with id - ${user.id}`,
        });
      }

      return res.json({ success: true, message: 'User added as resident' });
    } catch (error) {
      console.log(`Error while adding user: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  },
);

router.get(
  '/pending-approvals',
  checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.SOCIETY_ADMIN]),
  async (req, res) => {
    try {
      const pendingApprovals = await KNEX(TABLES.UserRoles)
        .select([
          `${TABLES.Users}.firstName as name`,
          `${TABLES.Users}.email`,
          `${TABLES.UserRoles}.role`,
          `${TABLES.Users}.mobileNumber`,
          `${TABLES.UserRoles}.id as userRoleId`,
        ])
        .where({
          status: USER_ROLES_APPROVAL_STATUS.PENDING,
        })
        .leftJoin(
          TABLES.Users,
          `${TABLES.UserRoles}.userId`,
          `${TABLES.Users}.id`,
        );

      return res.json({ success: true, data: pendingApprovals });
    } catch (error) {
      console.log(`Error while fetching pending approvals: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  },
);

export default router;
