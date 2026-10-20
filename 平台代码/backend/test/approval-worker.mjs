import { handleTeams } from "../src/teams.js";
try {
  await handleTeams(
    { method: "POST", headers: { authorization: `Bearer ${process.argv[3]}` } },
    new URL(process.argv[2], "http://local"),
    async () => ({}),
  );
  process.stdout.write("approved");
} catch (error) {
  process.stdout.write(error.code || error.message);
  process.exitCode = error.status === 409 ? 2 : 1;
}
