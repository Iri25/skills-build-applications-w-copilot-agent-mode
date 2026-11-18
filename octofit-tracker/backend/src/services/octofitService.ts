import { Activity, Team, User, Workout } from '../models/index.js';
import mongoose from 'mongoose';

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function activityPoints(type: string, minutes: number) {
  const multipliers: Record<string, number> = { strength: 1.5, run: 1.2, cycle: 1, walk: 1 };
  return Math.max(1, Math.round(minutes * (multipliers[type.toLowerCase()] ?? 1)));
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!isRecord(input)) throw httpError(400, 'A valid activity payload is required');
  const { userId, teamId, type, minutes } = input;
  if (typeof userId !== 'string' || typeof teamId !== 'string') throw httpError(400, 'Valid userId and teamId are required');
  if (!mongoose.isObjectIdOrHexString(userId) || !mongoose.isObjectIdOrHexString(teamId)) throw httpError(400, 'Malformed userId or teamId');
  if (typeof type !== 'string' || !type.trim()) throw httpError(400, 'Activity type is required');
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1) throw httpError(400, 'Minutes must be a positive number');

  const [user, team] = await Promise.all([
    User.findById(userId).lean(),
    Team.findById(teamId).lean(),
  ]);
  if (!user) throw httpError(404, 'User not found');
  if (!team) throw httpError(404, 'Team not found');

  const normalizedType = type.trim();
  return Activity.create({
    user: userId,
    team: teamId,
    type: normalizedType,
    minutes,
    points: activityPoints(normalizedType, minutes),
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!isRecord(input)) throw httpError(400, 'A valid team payload is required');
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const mascot = typeof input.mascot === 'string' ? input.mascot.trim() : '';
  if (!name) throw httpError(400, 'Team name is required');
  if (!mascot) throw httpError(400, 'Team mascot is required');

  const members = Array.isArray(input.members)
    ? input.members.filter((member): member is string => typeof member === 'string' && mongoose.isObjectIdOrHexString(member))
    : [];
  const existingMembers = members.length
    ? await User.find({ _id: { $in: members } }).select('_id').lean()
    : [];
  const validMemberIds = existingMembers.map((member) => member._id);

  const team = await Team.create({ name, mascot, members: validMemberIds });
  if (validMemberIds.length) {
    await User.updateMany({ _id: { $in: validMemberIds } }, { $set: { team: team._id } });
  }
  return team;
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate<{ _id: mongoose.Types.ObjectId; totalPoints: number }>([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
  ]);
  const teams = await Team.find({
    _id: { $in: totals.map((entry) => entry._id) },
  }).lean();
  const teamNames = new Map(teams.map((team) => [team._id.toString(), team.name]));

  return totals
    .filter((entry) => teamNames.has(entry._id.toString()))
    .sort((left, right) => right.totalPoints - left.totalPoints)
    .map((entry, index) => ({
      teamName: teamNames.get(entry._id.toString()),
      totalPoints: entry.totalPoints,
      rank: index + 1,
    }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).lean();
  if (!user) throw httpError(404, 'User not found');

  const recentActivity = await Activity.find({ user: user._id })
    .sort({ occurredAt: -1 })
    .limit(1)
    .lean();
  const activityType = recentActivity[0]?.type?.toLowerCase();
  const focus = activityType === 'run' || activityType === 'cycle' || activityType === 'walk'
    ? 'endurance'
    : activityType === 'strength'
      ? 'strength'
      : user.fitnessGoal;

  const workouts = await Workout.find({ focus }).lean();
  if (!workouts.length) return [];
  return workouts.map((workout) => ({
    ...workout,
    reason: activityType
      ? `Recent ${activityType} activity suggests this ${focus} workout`
      : `Matches your ${focus} fitness goal`,
  }));
}

export { User };
