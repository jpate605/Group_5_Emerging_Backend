const { buildSchema } = require("graphql");
const User = require("../models/User");
const VitalSigns = require("../models/VitalSign");
const DailyInfo = require("../models/DailyInfo");
const Symptoms = require("../models/Symptoms");
const bcrypt = require("bcryptjs");
const { generateToken, validateUserCredentials } = require("../utils/auth");

const schema = buildSchema(`
    type User {
        id: ID!
        username: String!
        role: String!
        token: String!
    }

    type VitalSigns {
        id: ID!
        nurseId: ID!
        patientId: ID!
        bodyTemperature: Float
        heartRate: Float
        bloodPressure: String
        respiratoryRate: Float
        createdAt: String
    }

    type DailyInfo {
        id: ID!
        patientId: ID!
        pulseRate: Float
        bloodPressure: String
        weight: Float
        temperature: Float
        respiratoryRate: Float
        createdAt: String
        recordedAt: String
    }

    type Symptoms {
        id: ID!
        patientId: ID!
        symptomsList: [String]
        createdAt: String
        recordedAt: String
    }

    type Query {
        users: [User]
        nurses: [User]
        patients: [User]
        getVitalSignsByPatientUsername(patientUsername: String!): [VitalSigns]
        getDailyInfoByPatientUsername(patientUsername: String!): [DailyInfo]
        getSymptomsByPatientUsername(patientUsername: String!): [Symptoms]
        currentUser: User
    }

    type Mutation {
        register(username: String!, password: String!, role: String!): AuthPayload
        login(username: String!, password: String!): User
        recordVitalSigns(nurseUsername: String!, patientId: ID!, bodyTemperature: Float, heartRate: Float, bloodPressure: String, respiratoryRate: Float): VitalSigns
        recordDailyInfo(patientUsername: String!, pulseRate: Float, bloodPressure: String, weight: Float, temperature: Float, respiratoryRate: Float): DailyInfo
        recordSymptoms(patientUsername: String!, symptomsList: [String]!): Symptoms
    }

    type AuthPayload {
      user: User!
      token: String!
    }
`);

const root = {
  users: () => User.find(),
  nurses: () => User.find({ role: "nurse" }),
  patients: () => User.find({ role: "patient" }),
  getDailyInfoByPatientUsername: async ({ patientUsername }) => {
    const patient = await User.findOne({
      username: patientUsername,
      role: "patient",
    });
    if (!patient) {
      throw new Error("Patient not found");
    }
    return await DailyInfo.find({ patientId: patient._id }).sort({
      createdAt: -1,
    });
  },
  getSymptomsByPatientUsername: async ({ patientUsername }) => {
    const patient = await User.findOne({ username: patientUsername });
    if (!patient) {
      throw new Error("Patient not found");
    }
    return await Symptoms.find({ patientId: patient._id }).sort({
      createdAt: -1,
    });
  },
  getVitalSignsByPatientUsername: async ({ patientUsername }) => {
    const patient = await User.findOne({
      username: patientUsername,
      role: "patient",
    });
    if (!patient) {
      throw new Error("Patient not found");
    }
    const vitalSigns = await VitalSigns.find({ patientId: patient._id })
      .populate("nurseId", "username")
      .lean();
    return vitalSigns.map((vs) => ({
      ...vs,
      nurseId: vs.nurseId.username,
      id: vs._id.toString(),
      patientId: vs.patientId.toString(),
    }));
  },
  register: async ({ username, password, role }) => {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      throw new Error("User already exists");
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({ username, password: hashedPassword, role });
    await newUser.save();
    const token = generateToken(newUser._id);
    return { user: newUser, token };
  },

  login: async (_, { username, password }) => {
    // Validate user credentials and get user info
    const user = await validateUserCredentials(username, password);

    // Generate token for user
    const token = generateToken(user._id);

    // Return user object with token
    return {
      id: user._id,
      username: user.username,
      role: user.role,
      token: token,
    };
  },
  recordVitalSigns: async ({
    nurseUsername,
    patientId,
    bodyTemperature,
    heartRate,
    bloodPressure,
    respiratoryRate,
  }) => {
    const nurse = await User.findOne({
      username: nurseUsername,
      role: "nurse",
    });
    if (!nurse) {
      throw new Error("Nurse not found");
    }

    const patient = await User.findById(patientId);
    if (!patient) {
      throw new Error("Patient not found");
    }

    try {
      const newVitalSigns = new VitalSigns({
        nurseId: nurse._id,
        patientId: patient._id,
        bodyTemperature,
        heartRate,
        bloodPressure,
        respiratoryRate,
        createdAt: new Date(),
      });
      return await newVitalSigns.save();
    } catch (error) {
      throw new Error("Error saving vital signs");
    }
  },

  recordDailyInfo: async ({
    patientUsername,
    pulseRate,
    bloodPressure,
    weight,
    temperature,
    respiratoryRate,
  }) => {
    const patient = await User.findOne({
      username: patientUsername,
      role: "patient",
    });
    if (!patient) {
      throw new Error("Patient not found");
    }
    try {
      const newDailyInfo = new DailyInfo({
        patientId: patient._id,
        pulseRate,
        bloodPressure,
        weight,
        temperature,
        respiratoryRate,
        recordedAt: new Date(),
      });
      return await newDailyInfo.save();
    } catch (error) {
      throw new Error("Error saving daily info");
    }
  },

  recordSymptoms: async ({ patientUsername, symptomsList }) => {
    // Find the patient by username
    const patient = await User.findOne({ username: patientUsername });
    if (!patient) {
      throw new Error("Patient not found");
    }

    // Create a new Symptoms document using the patient's ID
    const newSymptoms = new Symptoms({
      patientId: patient._id,
      symptomsList,
      recordedAt: new Date(),
    });

    // Save and return the new Symptoms document
    return newSymptoms.save();
  },

  currentUser: (args, context) => {
    return context.req.session.user;
  },
};

module.exports = { schema, root };
