import { Router } from 'express';
import {
  COMPLAINT_STATUS,
  COMPLAINT_TYPES,
  REQUEST_VALIDATOR_MODIFICATIONS,
  USER_ROLES,
} from '../../../constants.js';
import { checkRole } from '../../../middlewares/checkRole.js';
import { KNEX, TABLES } from '../../../services/knex.js';
import { sanitizeAndValidateRequest } from '../../../utils/sanitize.js';
import { requestValidator } from '../../../utils/validator.js';
import validationSchemas from '../utils/validationSchema.js';
import { sendNotificationToRentalUnit } from '../../../utils/helpers.js';

const router = Router();

router.get('/category', async (req, res) => {
  try {
    const categories = await KNEX(TABLES.ComplaintCategories);

    return res.json({ success: true, data: categories });
  } catch (error) {
    console.log(`Error while fetching complaint category: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

router.patch(
  '/category',
  checkRole([USER_ROLES.SOCIETY_ADMIN, USER_ROLES.SUPER_ADMIN]),
  async ({ body }, res) => {
    try {
      sanitizeAndValidateRequest(body, validationSchemas.updateCategory, {
        BEFORE_VALIDATION: {
          name: [
            REQUEST_VALIDATOR_MODIFICATIONS.TRIM,
            REQUEST_VALIDATOR_MODIFICATIONS.UPPERCASE,
          ],
        },
      });

      const { categoryId, name } = body;

      const [categoryExists] = await KNEX(TABLES.ComplaintCategories)
        .where({ id: categoryId })
        .limit(1);

      const [nameExists] = await KNEX(TABLES.ComplaintCategories)
        .where({ name })
        .limit(1);

      if (!categoryExists) {
        throw new Error('Invalid category id');
      }

      if (nameExists) {
        throw new Error('Name already exists');
      }

      await KNEX(TABLES.ComplaintCategories)
        .where({ id: categoryId })
        .update({ name });

      return res.json({
        success: true,
        message: 'Category updated successfully',
      });
    } catch (error) {
      console.log(`Error while updating complaint category: ${error.message}`);

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.post(
  '/category',
  checkRole([USER_ROLES.SOCIETY_ADMIN, USER_ROLES.SUPER_ADMIN]),
  async ({ body }, res) => {
    try {
      sanitizeAndValidateRequest(body, validationSchemas.createCategory, {
        BEFORE_VALIDATION: {
          name: [
            REQUEST_VALIDATOR_MODIFICATIONS.TRIM,
            REQUEST_VALIDATOR_MODIFICATIONS.UPPERCASE,
          ],
        },
      });

      const { name } = body;

      const [category] = await KNEX(TABLES.ComplaintCategories).where({
        name,
      });

      if (category) {
        return res.status(400).json({
          success: false,
          message: 'Category already exists',
        });
      }

      await KNEX(TABLES.ComplaintCategories).insert({ name });

      return res.json({
        success: true,
        message: 'Category inserted successfully',
      });
    } catch (error) {
      console.log(`Error while creating complaint category: ${error.message}`);

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.get(
  '/admin',
  checkRole([USER_ROLES.SOCIETY_ADMIN]),
  async ({ user, query }, res) => {
    try {
      // need to add filters
      requestValidator(query, validationSchemas.fetchComplaint);

      const { type, category, status } = query;

      const [userRole] = await KNEX(TABLES.UserRoles).where({
        role: USER_ROLES.SOCIETY_ADMIN,
        userId: user.id,
      });

      if (!userRole) throw new Error('Invalid user');

      let complaints = [];
      let communityComplaints = [];
      let personalComplaints = [];

      if (
        type === COMPLAINT_TYPES.COMMUNITY ||
        type === null ||
        type === undefined
      ) {
        communityComplaints = await KNEX(TABLES.Complaints)
          .select(
            `${TABLES.Complaints}.id as complaintId`,
            `${TABLES.Complaints}.createdAt as complaintCreatedAt`,
            `${TABLES.Complaints}.updatedAt as complaintupdatedAt`,
            `${TABLES.Complaints}.rentalUnitId as rentalUnitId`,
            `${TABLES.Complaints}.subCategory`,
            `${TABLES.Complaints}.type`,
            `${TABLES.Complaints}.message`,
            `${TABLES.Complaints}.image`,
            `${TABLES.Complaints}.rating`,
            `${TABLES.Complaints}.status`,
            `${TABLES.Complaints}.societyId`,
            `${TABLES.Complaints}.categoryId`,

            `${TABLES.ComplaintCategories}.name as category`,
            `${TABLES.ComplaintCategories}.id as categoryId`,

            `${TABLES.Users}.id as userId`,
            `${TABLES.Users}.firstName as userFirstName`,
          )
          .where({
            societyId: userRole.societyId,
            type: COMPLAINT_TYPES.COMMUNITY,
          })
          .innerJoin(
            TABLES.ComplaintCategories,
            `${TABLES.ComplaintCategories}.id`,
            `${TABLES.Complaints}.categoryId`,
          )
          .innerJoin(
            TABLES.Users,
            `${TABLES.Users}.id`,
            `${TABLES.Complaints}.userId`,
          )
          .modify((queryBuilder) => {
            if (category)
              queryBuilder.where({
                [`${TABLES.ComplaintCategories}.name`]: category,
              });
            if (status) queryBuilder.where({ status });
          });

        for (let index = 0; index < communityComplaints.length; index++) {
          const complaint = communityComplaints[index];
          const comments = await KNEX(TABLES.ComplaintComments)
            .select([
              `${TABLES.ComplaintComments}.id as id`,
              `${TABLES.ComplaintComments}.createdAt`,
              `${TABLES.ComplaintComments}.comment`,
              `${TABLES.ComplaintComments}.photoUrl`,
              `${TABLES.Users}.id as userId`,
              `${TABLES.Users}.firstName`,
              `${TABLES.Users}.lastName`,
            ])
            .where({
              complaintId: complaint.complaintId,
            })
            .innerJoin(
              TABLES.Users,
              `${TABLES.Users}.id`,
              `${TABLES.ComplaintComments}.userId`,
            )
            .orderBy('createdAt');
          complaint['comments'] = comments;

          const [rentalUnit] = await KNEX(TABLES.UserRoles)
            .select([
              `${TABLES.RentalUnits}.id as rentalUnitId`,
              `${TABLES.RentalUnits}.name as rentalUnitName`,
              `${TABLES.RentalUnits}.type as rentalUnitType`,
              `${TABLES.Floors}.id as floorId`,
              `${TABLES.Floors}.name as floorName`,
              `${TABLES.Blocks}.id as blockId`,
              `${TABLES.Blocks}.name as blockName`,
            ])
            .innerJoin(
              TABLES.RentalUnits,
              `${TABLES.RentalUnits}.id`,
              `${TABLES.UserRoles}.rentalUnitId`,
            )
            .innerJoin(
              TABLES.Floors,
              `${TABLES.Floors}.id`,
              `${TABLES.RentalUnits}.floorId`,
            )
            .innerJoin(
              TABLES.Blocks,
              `${TABLES.Blocks}.id`,
              `${TABLES.Floors}.blockId`,
            )
            .where({
              [`${TABLES.UserRoles}.userId`]: complaint.userId,
              role: USER_ROLES.RESIDENT,
            })
            .limit(1);

          complaint['rentalUnit'] = rentalUnit;
        }
      }

      if (
        type === COMPLAINT_TYPES.PERSONAL ||
        type === null ||
        type === undefined
      ) {
        personalComplaints = await KNEX(TABLES.Complaints)
          .select(
            `${TABLES.Complaints}.id as complaintId`,
            `${TABLES.Complaints}.createdAt as complaintCreatedAt`,
            `${TABLES.Complaints}.updatedAt as complaintupdatedAt`,
            `${TABLES.Complaints}.rentalUnitId as rentalUnitId`,
            `${TABLES.Complaints}.subCategory`,
            `${TABLES.Complaints}.type`,
            `${TABLES.Complaints}.message`,
            `${TABLES.Complaints}.image`,
            `${TABLES.Complaints}.rating`,
            `${TABLES.Complaints}.status`,
            `${TABLES.Complaints}.societyId`,
            `${TABLES.Complaints}.categoryId`,

            `${TABLES.ComplaintCategories}.name as category`,
            `${TABLES.ComplaintCategories}.id as categoryId`,

            `${TABLES.Users}.id as userId`,
            `${TABLES.Users}.firstName as userFirstName`,
          )
          .where({
            societyId: userRole.societyId,
            type: COMPLAINT_TYPES.PERSONAL,
          })
          .innerJoin(
            TABLES.ComplaintCategories,
            `${TABLES.ComplaintCategories}.id`,
            `${TABLES.Complaints}.categoryId`,
          )
          .innerJoin(
            TABLES.Users,
            `${TABLES.Users}.id`,
            `${TABLES.Complaints}.userId`,
          )
          .modify((queryBuilder) => {
            if (category)
              queryBuilder.where({
                [`${TABLES.ComplaintCategories}.name`]: category,
              });
            if (status) queryBuilder.where({ status });
          });

        for (let index = 0; index < personalComplaints.length; index++) {
          const complaint = personalComplaints[index];
          const comments = await KNEX(TABLES.ComplaintComments)
            .select([
              `${TABLES.ComplaintComments}.id as id`,
              `${TABLES.ComplaintComments}.createdAt`,
              `${TABLES.ComplaintComments}.comment`,
              `${TABLES.ComplaintComments}.photoUrl`,
              `${TABLES.Users}.id as userId`,
              `${TABLES.Users}.firstName`,
              `${TABLES.Users}.lastName`,
            ])
            .where({
              complaintId: complaint.complaintId,
            })
            .innerJoin(
              TABLES.Users,
              `${TABLES.Users}.id`,
              `${TABLES.ComplaintComments}.userId`,
            )
            .orderBy('createdAt');
          complaint['comments'] = comments;

          const [rentalUnit] = await KNEX(TABLES.UserRoles)
            .select([
              `${TABLES.RentalUnits}.id as rentalUnitId`,
              `${TABLES.RentalUnits}.name as rentalUnitName`,
              `${TABLES.RentalUnits}.type as rentalUnitType`,
              `${TABLES.Floors}.id as floorId`,
              `${TABLES.Floors}.name as floorName`,
              `${TABLES.Blocks}.id as blockId`,
              `${TABLES.Blocks}.name as blockName`,
            ])
            .innerJoin(
              TABLES.RentalUnits,
              `${TABLES.RentalUnits}.id`,
              `${TABLES.UserRoles}.rentalUnitId`,
            )
            .innerJoin(
              TABLES.Floors,
              `${TABLES.Floors}.id`,
              `${TABLES.RentalUnits}.floorId`,
            )
            .innerJoin(
              TABLES.Blocks,
              `${TABLES.Blocks}.id`,
              `${TABLES.Floors}.blockId`,
            )
            .where({
              [`${TABLES.UserRoles}.userId`]: complaint.userId,
              role: USER_ROLES.RESIDENT,
            })
            .limit(1);

          complaint['rentalUnit'] = rentalUnit;
        }
      }

      complaints = [...personalComplaints, ...communityComplaints];
      complaints = complaints.sort((a, b) => a.createdAt - b.createdAt);

      return res.json({ success: true, data: complaints });
    } catch (error) {
      console.log(`Error while fetching complaints: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) throw new Error('Invalid complaint id');

    const [complaint] = await KNEX(TABLES.Complaints)
      .select(
        `${TABLES.Complaints}.id as complaintId`,
        `${TABLES.Complaints}.createdAt as complaintCreatedAt`,
        `${TABLES.Complaints}.updatedAt as complaintupdatedAt`,
        `${TABLES.Complaints}.userId as userId`,
        `${TABLES.Complaints}.rentalUnitId as rentalUnitId`,
        `${TABLES.Complaints}.subCategory`,
        `${TABLES.Complaints}.type`,
        `${TABLES.Complaints}.message`,
        `${TABLES.Complaints}.image`,
        `${TABLES.Complaints}.rating`,
        `${TABLES.Complaints}.status`,
        `${TABLES.Complaints}.societyId`,
        `${TABLES.Complaints}.categoryId`,

        `${TABLES.ComplaintCategories}.name as category`,
        `${TABLES.ComplaintCategories}.id as categoryId`,

        `${TABLES.Users}.id as userId`,
        `${TABLES.Users}.firstName as userFirstName`,
      )
      .where({
        [`${TABLES.Complaints}.id`]: id,
      })
      .innerJoin(
        TABLES.ComplaintCategories,
        `${TABLES.ComplaintCategories}.id`,
        `${TABLES.Complaints}.categoryId`,
      )
      .innerJoin(
        TABLES.Users,
        `${TABLES.Users}.id`,
        `${TABLES.Complaints}.userId`,
      )
      .limit(1);

    if (!complaint) throw new Error('Invalid complaint id');

    const comments = await KNEX(TABLES.ComplaintComments)
      .select([
        `${TABLES.ComplaintComments}.id as id`,
        `${TABLES.ComplaintComments}.createdAt`,
        `${TABLES.ComplaintComments}.comment`,
        `${TABLES.ComplaintComments}.photoUrl`,
        `${TABLES.Users}.id as userId`,
        `${TABLES.Users}.firstName`,
        `${TABLES.Users}.lastName`,
      ])
      .where({
        complaintId: id,
      })
      .innerJoin(
        TABLES.Users,
        `${TABLES.Users}.id`,
        `${TABLES.ComplaintComments}.userId`,
      )
      .orderBy('createdAt');
    complaint['comments'] = comments;

    const [rentalUnit] = await KNEX(TABLES.UserRoles)
      .select([
        `${TABLES.RentalUnits}.id as rentalUnitId`,
        `${TABLES.RentalUnits}.name as rentalUnitName`,
        `${TABLES.RentalUnits}.type as rentalUnitType`,
        `${TABLES.Floors}.id as floorId`,
        `${TABLES.Floors}.name as floorName`,
        `${TABLES.Blocks}.id as blockId`,
        `${TABLES.Blocks}.name as blockName`,
      ])
      .innerJoin(
        TABLES.RentalUnits,
        `${TABLES.RentalUnits}.id`,
        `${TABLES.UserRoles}.rentalUnitId`,
      )
      .innerJoin(
        TABLES.Floors,
        `${TABLES.Floors}.id`,
        `${TABLES.RentalUnits}.floorId`,
      )
      .innerJoin(
        TABLES.Blocks,
        `${TABLES.Blocks}.id`,
        `${TABLES.Floors}.blockId`,
      )
      .where({
        [`${TABLES.UserRoles}.userId`]: complaint.userId,
        role: USER_ROLES.RESIDENT,
      })
      .limit(1);

    complaint['rentalUnit'] = rentalUnit;

    return res.json({ success: true, data: complaint });
  } catch (error) {
    console.log(`Error while fetching single complaint: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

router.get(
  '/',
  checkRole([USER_ROLES.RESIDENT]),
  async ({ user, query }, res) => {
    try {
      requestValidator(query, validationSchemas.fetchComplaint);

      const { type, category, status } = query;

      const [userRole] = await KNEX(TABLES.UserRoles).where({
        role: USER_ROLES.RESIDENT,
        userId: user.id,
      });

      if (!userRole) throw new Error('Invalid user');

      let complaints = [];
      let communityComplaints = [];
      let personalComplaints = [];

      if (
        type === COMPLAINT_TYPES.COMMUNITY ||
        type === null ||
        type === undefined
      ) {
        communityComplaints = await KNEX(TABLES.Complaints)
          .select(
            `${TABLES.Complaints}.id as complaintId`,
            `${TABLES.Complaints}.createdAt as complaintCreatedAt`,
            `${TABLES.Complaints}.updatedAt as complaintupdatedAt`,
            `${TABLES.Complaints}.userId as userId`,
            `${TABLES.Complaints}.rentalUnitId as rentalUnitId`,
            `${TABLES.Complaints}.subCategory`,
            `${TABLES.Complaints}.type`,
            `${TABLES.Complaints}.message`,
            `${TABLES.Complaints}.image`,
            `${TABLES.Complaints}.rating`,
            `${TABLES.Complaints}.status`,
            `${TABLES.Complaints}.societyId`,
            `${TABLES.Complaints}.categoryId`,

            `${TABLES.ComplaintCategories}.name as category`,
            `${TABLES.ComplaintCategories}.id as categoryId`,
          )
          .where({
            societyId: userRole.societyId,
            type: COMPLAINT_TYPES.COMMUNITY,
          })
          .innerJoin(
            TABLES.ComplaintCategories,
            `${TABLES.ComplaintCategories}.id`,
            `${TABLES.Complaints}.categoryId`,
          )
          .modify((queryBuilder) => {
            if (category)
              queryBuilder.where({
                [`${TABLES.ComplaintCategories}.name`]: category,
              });
            if (status) queryBuilder.where({ status });
          });

        for (let index = 0; index < communityComplaints.length; index++) {
          const complaint = communityComplaints[index];
          const comments = await KNEX(TABLES.ComplaintComments)
            .select([
              `${TABLES.ComplaintComments}.id as id`,
              `${TABLES.ComplaintComments}.createdAt`,
              `${TABLES.ComplaintComments}.comment`,
              `${TABLES.ComplaintComments}.photoUrl`,
              `${TABLES.Users}.id as userId`,
              `${TABLES.Users}.firstName`,
              `${TABLES.Users}.lastName`,
            ])
            .where({
              complaintId: complaint.complaintId,
            })
            .innerJoin(
              TABLES.Users,
              `${TABLES.Users}.id`,
              `${TABLES.ComplaintComments}.userId`,
            )
            .orderBy('createdAt');
          complaint['comments'] = comments;

          const [rentalUnit] = await KNEX(TABLES.UserRoles)
            .select([
              `${TABLES.RentalUnits}.id as rentalUnitId`,
              `${TABLES.RentalUnits}.name as rentalUnitName`,
              `${TABLES.RentalUnits}.type as rentalUnitType`,
              `${TABLES.Floors}.id as floorId`,
              `${TABLES.Floors}.name as floorName`,
              `${TABLES.Blocks}.id as blockId`,
              `${TABLES.Blocks}.name as blockName`,
            ])
            .innerJoin(
              TABLES.RentalUnits,
              `${TABLES.RentalUnits}.id`,
              `${TABLES.UserRoles}.rentalUnitId`,
            )
            .innerJoin(
              TABLES.Floors,
              `${TABLES.Floors}.id`,
              `${TABLES.RentalUnits}.floorId`,
            )
            .innerJoin(
              TABLES.Blocks,
              `${TABLES.Blocks}.id`,
              `${TABLES.Floors}.blockId`,
            )
            .where({
              [`${TABLES.UserRoles}.userId`]: complaint.userId,
              role: USER_ROLES.RESIDENT,
            })
            .limit(1);

          complaint['rentalUnit'] = rentalUnit;
        }
      }

      if (
        type === COMPLAINT_TYPES.PERSONAL ||
        type === null ||
        type === undefined
      ) {
        personalComplaints = await KNEX(TABLES.Complaints)
          .select(
            `${TABLES.Complaints}.id as complaintId`,
            `${TABLES.Complaints}.createdAt as complaintCreatedAt`,
            `${TABLES.Complaints}.updatedAt as complaintupdatedAt`,
            `${TABLES.Complaints}.userId as userId`,
            `${TABLES.Complaints}.rentalUnitId as rentalUnitId`,
            `${TABLES.Complaints}.subCategory`,
            `${TABLES.Complaints}.type`,
            `${TABLES.Complaints}.message`,
            `${TABLES.Complaints}.image`,
            `${TABLES.Complaints}.rating`,
            `${TABLES.Complaints}.status`,
            `${TABLES.Complaints}.societyId`,
            `${TABLES.Complaints}.categoryId`,

            `${TABLES.ComplaintCategories}.name as category`,
            `${TABLES.ComplaintCategories}.id as categoryId`,
          )
          .where({
            societyId: userRole.societyId,
            type: COMPLAINT_TYPES.PERSONAL,
            rentalUnitId: userRole.rentalUnitId,
          })
          .innerJoin(
            TABLES.ComplaintCategories,
            `${TABLES.ComplaintCategories}.id`,
            `${TABLES.Complaints}.categoryId`,
          )
          .modify((queryBuilder) => {
            if (category)
              queryBuilder.where({
                [`${TABLES.ComplaintCategories}.name`]: category,
              });
            if (status) queryBuilder.where({ status });
          });

        for (let index = 0; index < personalComplaints.length; index++) {
          const complaint = personalComplaints[index];
          const comments = await KNEX(TABLES.ComplaintComments)
            .select([
              `${TABLES.ComplaintComments}.id as id`,
              `${TABLES.ComplaintComments}.createdAt`,
              `${TABLES.ComplaintComments}.comment`,
              `${TABLES.ComplaintComments}.photoUrl`,
              `${TABLES.Users}.id as userId`,
              `${TABLES.Users}.firstName`,
              `${TABLES.Users}.lastName`,
            ])
            .where({
              complaintId: complaint.complaintId,
            })
            .innerJoin(
              TABLES.Users,
              `${TABLES.Users}.id`,
              `${TABLES.ComplaintComments}.userId`,
            )
            .orderBy('createdAt');
          complaint['comments'] = comments;

          const [rentalUnit] = await KNEX(TABLES.UserRoles)
            .select([
              `${TABLES.RentalUnits}.id as rentalUnitId`,
              `${TABLES.RentalUnits}.name as rentalUnitName`,
              `${TABLES.RentalUnits}.type as rentalUnitType`,
              `${TABLES.Floors}.id as floorId`,
              `${TABLES.Floors}.name as floorName`,
              `${TABLES.Blocks}.id as blockId`,
              `${TABLES.Blocks}.name as blockName`,
            ])
            .innerJoin(
              TABLES.RentalUnits,
              `${TABLES.RentalUnits}.id`,
              `${TABLES.UserRoles}.rentalUnitId`,
            )
            .innerJoin(
              TABLES.Floors,
              `${TABLES.Floors}.id`,
              `${TABLES.RentalUnits}.floorId`,
            )
            .innerJoin(
              TABLES.Blocks,
              `${TABLES.Blocks}.id`,
              `${TABLES.Floors}.blockId`,
            )
            .where({
              [`${TABLES.UserRoles}.userId`]: complaint.userId,
              role: USER_ROLES.RESIDENT,
            })
            .limit(1);

          complaint['rentalUnit'] = rentalUnit;
        }
      }

      complaints = [...personalComplaints, ...communityComplaints];
      complaints = complaints.sort((a, b) => a.createdAt - b.createdAt);

      return res.json({ success: true, data: complaints });
    } catch (error) {
      console.log(`Error while fetching complaints: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

// todo: if user is admin in society A, then he can't be admin in society B
router.patch(
  '/',
  checkRole([USER_ROLES.SOCIETY_ADMIN]),
  async ({ body, user }, res) => {
    try {
      requestValidator(body, validationSchemas.updateStatus);

      const [complaint] = await KNEX(TABLES.Complaints).where({
        id: body.complaintId,
      });

      if (!complaint) throw new Error('Invalid complaint');

      const [userRole] = await KNEX(TABLES.UserRoles).where({
        userId: user.id,
        role: USER_ROLES.SOCIETY_ADMIN,
        societyId: complaint.societyId,
      });

      if (!userRole) throw new Error('Invalid user');

      await KNEX(TABLES.Complaints)
        .update({ status: body.status })
        .where({ id: complaint.id });

      await KNEX(TABLES.ComplaintStatus).insert({
        name: body.status,
        complaintId: complaint.id,
        message: `Status was updated to - ${body.status} by user - ${user.id}`,
      });

      await sendNotificationToRentalUnit({
        rentalUnitId: complaint.rentalUnitId,
        title: 'Complaint Status Updated',
        message: `Your complaint has been updated to ${body.status}`,
      });

      return res.json({ success: true });
    } catch (error) {
      console.log(`Error while updating complaints: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.post(
  '/',
  checkRole([USER_ROLES.RESIDENT]),
  async ({ body, user }, res) => {
    try {
      // check if payload is valid
      requestValidator(body, validationSchemas.createComplaint);

      // if rental unit is provided check if it belongs to the user
      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({
          userId: user.id,
          rentalUnitId: body.rentalUnitId,
        })
        .limit(1);

      if (!userRole) throw Error('User not associated with any rental unit');

      const [category] = await KNEX(TABLES.ComplaintCategories)
        .where({ id: body.categoryId })
        .limit(1);

      if (!category) throw Error('Invalid category');

      // make entry into table
      const complaintPayload = {
        ...body,
        status: COMPLAINT_STATUS.NEW,
        userId: user.id,
      };
      const [createdComplaint] = await KNEX(TABLES.Complaints)
        .insert(complaintPayload)
        .returning('id');

      await KNEX(TABLES.ComplaintStatus).insert({
        complaintId: createdComplaint.id,
        name: COMPLAINT_STATUS.NEW,
        message: 'Complaint created',
      });

      return res.json({
        success: true,
        message: 'Compaint created successfully',
      });
    } catch (error) {
      console.log(`Error while inserting complaint: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.post('/comment', async ({ user, body }, res) => {
  try {
    // validating payload
    requestValidator(body, validationSchemas.createComment);

    // checking if complaint is valid
    const [complaint] = await KNEX(TABLES.Complaints).where({
      id: body.complaintId,
    });

    if (!complaint) throw new Error('Invalid complaint');

    // checking if issue is already resolved or not
    if (complaint.status === COMPLAINT_STATUS.RESOLVED) {
      throw new Error("Can't add comment to resolved cases");
    }

    // inserting into comments table
    await KNEX(TABLES.ComplaintComments).insert({
      userId: user.id,
      complaintId: body.complaintId,
      comment: body.comment,
      photoUrl: body.photoUrl,
    });

    await sendNotificationToRentalUnit({
      rentalUnitId: complaint.rentalUnitId,
      title: 'New comment on complaint',
      message: `${user.firstName} commented on your complaint`,
    });

    return res.json({ success: true, message: 'Comment added successfully' });
  } catch (error) {
    console.log(`Error while inserting complaint comment: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

router.post('/resolve', async ({ body, user }, res) => {
  try {
    // validate request
    requestValidator(body, validationSchemas.resolveComplaint);

    // check if valid complaint
    const [complaint] = await KNEX(TABLES.Complaints)
      .where({ id: body.complaintId })
      .andWhereNot({ status: COMPLAINT_STATUS.RESOLVED });

    if (!complaint) throw new Error(`Invalid complaint`);

    // check if request is from someone from same rental unit or society admin
    const [isSocietyAdmin] = await KNEX(TABLES.UserRoles).where({
      userId: user.id,
      role: USER_ROLES.SOCIETY_ADMIN,
      societyId: complaint.societyId,
    });

    const [isValidUser] = await KNEX(TABLES.UserRoles).where({
      userId: user.id,
      rentalUnitId: complaint.rentalUnitId,
    });

    if (!(isSocietyAdmin || isValidUser)) {
      throw new Error('Invalid permission to resolve complaint');
    }

    // mark resolved along with entry in status table and commnets table
    const updateBody = {
      status: COMPLAINT_STATUS.RESOLVED,
      ...(body.rating && { rating: body.rating }),
    };

    await KNEX(TABLES.Complaints)
      .where({ id: complaint.id })
      .update(updateBody);

    await KNEX(TABLES.ComplaintStatus).insert({
      complaintId: complaint.id,
      name: COMPLAINT_STATUS.RESOLVED,
      message: `Complaint resolved successfully by user - ${user.id}`,
    });

    if (body.comment) {
      await KNEX(TABLES.ComplaintComments).insert({
        userId: user.id,
        comment: body.comment,
        complaintId: complaint.id,
      });
    }

    return res.json({ success: true, message: `Complaint resolved` });
  } catch (error) {
    console.log(`Error while resolving complaint: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

export default router;
