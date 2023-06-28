import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../../env.js";

export const generateJWT = (payload) => {
  const secret = JWT_SECRET;

  return jwt.sign(payload, secret, {
    expiresIn: "1y",
    notBefore: 0,
  });
};
