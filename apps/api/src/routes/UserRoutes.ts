// import HttpStatusCodes from "@src/common/HttpStatusCodes";
// import UserService from "@src/services/UserService";
// import { User, UserSchema } from "@src/models/User";

// import { IReq, IRes } from "./common/types";
// import check from "./common/check";
// import { Response, Request } from "express";

// // **** Functions **** //

// /**
//  * Get all users.
//  */
// async function getAll(_: IReq, res: IRes) {
//   const users = await UserService.getAll();
//   res.status(HttpStatusCodes.OK).json({ users });
// }

// /**
//  * Add one user.
//  */
// async function add(req: Request, res: Response) {

//   try {
//     await UserService.addOne(UserSchema.parse(req.body));
//     res.status(HttpStatusCodes.CREATED).end();
//   } catch (error) {
//     res.status(HttpStatusCodes.BAD_REQUEST).json({ error: error.message });
//   }
// }

// /**
//  * Update one user.
//  */
// async function update(req: IReq, res: IRes) {
//   const user = UserSchema.parse(req.body);
//   await UserService.updateOne(user);
//   res.status(HttpStatusCodes.OK).end();
// }

// /**
//  * Delete one user.
//  */
// async function delete_(req: IReq, res: IRes) {
//   const id = check.isNum(req.params, "id");
//   await UserService.delete(id);
//   res.status(HttpStatusCodes.OK).end();
// }

// // **** Export default **** //

// export default {
//   getAll,
//   add,
//   update,
//   delete: delete_,
// } as const;
