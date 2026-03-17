const { Kafka } = require("kafkajs");

const KAFKA_BOOTSTRAP = process.env.KAFKA_BOOTSTRAP_SERVERS || "localhost:9092";
const TOPIC = "candidate-evaluation-request";

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

const sendEvaluationRequest = async (message) => {
  try {
    const p = await getProducer();
    await p.send({
      topic: TOPIC,
      messages: [{ value: JSON.stringify(message) }],
    });
    console.log(
      `Kafka: sent evaluation request for candidate=${message.candidate_id}, job=${message.job_id}`
    );
  } catch (err) {
    console.error("Kafka: failed to send evaluation request:", err.message);
  }
};

module.exports = { sendEvaluationRequest };
