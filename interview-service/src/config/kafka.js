const { Kafka } = require("kafkajs");

const kafka = new Kafka({
	clientId: "interview-service",
	brokers: [process.env.KAFKA_BOOTSTRAP_SERVERS || "localhost:9092"],
});

const producer = kafka.producer();

let connected = false;

const connectProducer = async () => {
	try {
		await producer.connect();
		connected = true;
		console.log("Kafka producer connected");
	} catch (error) {
		console.error("Kafka producer connection failed:", error.message);
		console.warn(
			"Interview completion events will not be published to Kafka",
		);
	}
};

const publishInterviewComplete = async (interviewData) => {
	if (!connected) {
		console.warn("Kafka producer not connected, skipping publish");
		return;
	}
	try {
		await producer.send({
			topic: "interview-complete",
			messages: [
				{
					key: interviewData.candidate_id,
					value: JSON.stringify(interviewData),
				},
			],
		});
		console.log(
			`Published interview-complete for candidate ${interviewData.candidate_id}`,
		);
	} catch (error) {
		console.error("Failed to publish interview-complete:", error.message);
	}
};

const disconnectProducer = async () => {
	if (connected) {
		await producer.disconnect();
		connected = false;
	}
};

module.exports = {
	connectProducer,
	publishInterviewComplete,
	disconnectProducer,
};
