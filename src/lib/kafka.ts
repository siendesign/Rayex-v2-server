import { Kafka, Producer, Consumer } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'rayex-api',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

let isKafkaConnected = false;
let producer: Producer;

export const connectKafka = async () => {
  try {
    producer = kafka.producer({
      retry: {
        initialRetryTime: 1000,
        retries: 2
      }
    });
    await producer.connect();
    isKafkaConnected = true;
    console.log('✅ Kafka Producer Connected');
  } catch (error) {
    console.log('⚠️ Kafka: Connection failed. Event streaming disabled.');
    isKafkaConnected = false;
  }
};

export const getProducer = () => {
  if (!producer || !isKafkaConnected) {
    return null;
  }
  return producer;
};

export const getIsKafkaConnected = () => isKafkaConnected;

export const createConsumer = (groupId: string): Consumer => {
  return kafka.consumer({ groupId });
};

export const emitEvent = async (topic: string, event: string, data: any) => {
  if (!isKafkaConnected) return;

  try {
    const producer = getProducer();
    if (!producer) return;

    await producer.send({
      topic,
      messages: [
        { 
          key: event,
          value: JSON.stringify(data) 
        },
      ],
    });
  } catch (error) {
    console.error(`❌ Error emitting Kafka event to ${topic}:`, error);
  }
};
