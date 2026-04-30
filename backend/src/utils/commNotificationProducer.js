const { Kafka } = require("kafkajs");

const KAFKA_BOOTSTRAP = process.env.KAFKA_BOOTSTRAP_SERVERS || "localhost:9092";
const TOPIC = "comm-notification";

const kafka = new Kafka({
  clientId: "recruitech-backend",
  brokers: KAFKA_BOOTSTRAP.split(","),
});

let producer = null;
let connected = false;

const getProducer = async () => {
  if (!producer) {
    producer = kafka.producer();
  }
  if (!connected) {
    await producer.connect();
    connected = true;
  }
  return producer;
};

const sendCommNotification = async (message) => {
  try {
    const p = await getProducer();
    await p.send({
      topic: TOPIC,
      messages: [{ value: JSON.stringify(message) }],
    });
    console.log(
      `Kafka: sent comm notification type=${message.notification_type}, candidate=${message.candidate_id}`
    );
  } catch (err) {
    console.error("Kafka: failed to send comm notification:", err.message);
  }
};

module.exports = { sendCommNotification };
