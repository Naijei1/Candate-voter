export function cognitoFailure(error: unknown): { status: number; message: string } {
  const name = error instanceof Error ? error.name : "";
  if (name === "UsernameExistsException") {
    return { status: 409, message: "An account with that email already exists." };
  }
  if (name === "NotAuthorizedException" || name === "UserNotFoundException") {
    return { status: 401, message: "Email or password is incorrect." };
  }
  if (name === "UserNotConfirmedException") {
    return { status: 403, message: "Confirm the code sent to your email." };
  }
  if (name === "CodeMismatchException" || name === "ExpiredCodeException") {
    return { status: 400, message: "That code does not match." };
  }
  if (name === "InvalidPasswordException" || name === "InvalidParameterException") {
    return { status: 400, message: "Use at least 12 characters, with upper case, lower case, and a number." };
  }
  if (name === "LimitExceededException" || name === "TooManyRequestsException") {
    return { status: 429, message: "Too many attempts. Try again later." };
  }
  return { status: 502, message: "Sign-in is unavailable." };
}

export function notConfigured(): Response {
  return Response.json(
    { ok: false, reason: "not_configured", message: "Sign-in is not set up on this server." },
    { status: 503 },
  );
}
