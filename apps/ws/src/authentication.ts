import { prisma } from "@repo/db";
import { verify } from "jsonwebtoken";
const JWT_SECRECT = process.env.JWT_SECRECT!;
export const authenticationUserBeforeOnline = async (ws, req) => {
    // const token = new URL()
    // const token = req.cookies.accessToken;
    const token = req.headers.cookie;
    // if user doesnt have token kick him in the ass before enter the room
    if (!token) {
        ws.close();
    }
    // verify the token 
    let decoded;
    try {
        decoded = verify(token, JWT_SECRECT) as {
            userId: string;
        };;
    } catch (error) {
        ws.close();
        return;
    }

    // user find 
    const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        omit: { password: true }
    })

    if (!user) {
        ws.close()
        return;
    }

    return {
        decoded,
        user
    };
}