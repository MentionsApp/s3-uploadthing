import { NextApiRequest, NextApiResponse } from "next";
import { generateTemporaryUrl } from "../utils";

/** Base path: pages/api/s3-temporary-url.ts */
export async function GenerateTemporaryUrlHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const key = req.query.key?.toString();

  if (!key) {
    return res.status(400);
  }

  const temporaryUrl = await generateTemporaryUrl(key);

  if (!temporaryUrl) throw new Error("Unexpected Error");

  res.redirect(temporaryUrl);
}
