import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../env.js';
import { KNEX, TABLES } from '../services/knex.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      console.log(`err in verifying token: ${err}`);
      return res.sendStatus(401);
    }

    const [userFromDB] = await KNEX(TABLES.Users)
      .where({ id: user.id })
      .limit(1);

    req.user = userFromDB;
    next();
  });
}
