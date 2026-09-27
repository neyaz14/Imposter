import { z, ZodError } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const zodErrorMessage = ({ error }: { error: ZodError }): string => {
  if (!error || !error.issues || error.issues.length === 0) {
    // console.log("inside zod error", error);
    return "Validation failed";
  }
  return error.issues.map((issue) => issue.message).join(", ");
};

export const zobject = {
  registerSchema,
  loginSchema,
};
