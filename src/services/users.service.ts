import { wsHub } from "@/lib/ws-hub";
import { toUserJson, UserModel } from "@/schemas/user.schema";

export const UsersService = {
  findById: async (id: string) => {
    const user = await UserModel.findById(id);
    return user ? toUserJson(user) : null;
  },

  updateMe: async (
    userId: string,
    input: {
      username?: string;
      avatarUrl?: string;
      bio?: string;
      accountType?: "open" | "closed";
    }
  ) => {
    const user = await UserModel.findByIdAndUpdate(userId, input, {
      new: true,
      runValidators: true,
    });
    return user ? toUserJson(user) : null;
  },

  search: async (query: string) => {
    const users = await UserModel.find({
      username: { $regex: query, $options: "i" },
    })
      .limit(20)
      .sort({ username: 1 });
    return users.map(toUserJson);
  },

  notify: (userId: string, payload: unknown) => {
    wsHub.emitToUser(userId, "notification:new", payload);
  },
};
