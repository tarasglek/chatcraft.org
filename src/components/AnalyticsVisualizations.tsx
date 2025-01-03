import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Box, Heading, VStack, Container } from "@chakra-ui/react";
import { ChatAnalytics, generateAnalytics } from "../lib/analytics";

export const AnalyticsVisualizations: React.FC = () => {
  const [analytics, setAnalytics] = useState<ChatAnalytics>();

  useEffect(() => {
    generateAnalytics().then(setAnalytics);
  }, [setAnalytics]);

  if (!analytics) {
    return null;
  }

  // Prepare model usage data
  const modelUsageData = Object.entries(analytics.modelMetrics.usage).map(([model, stats]) => ({
    name: model,
    messages: stats.messageCount,
    characters: stats.characterCount,
    avgResponseTime: Math.round(stats.avgResponseTime / 1000), // Convert to seconds
  }));

  // Prepare time series data
  const timeSeriesData = Object.entries(analytics.timeMetrics.byPeriod)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, stats]) => ({
      date: period,
      messages: stats.messageCount,
      conversations: stats.conversationCount,
      avgResponseTime: Math.round(stats.avgResponseTime / 1000),
    }));

  // Prepare hourly distribution data
  const hourlyData = Object.entries(analytics.timeMetrics.hourlyDistribution)
    .map(([hour, count]) => ({
      hour: `${hour}:00`,
      messages: count,
    }))
    .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

  return (
    <Container maxW="1200px" py={6}>
      <VStack spacing={8} align="stretch">
        {/* Model Usage Chart */}
        <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
          <Heading size="md" mb={6} textAlign="center">
            Model Usage
          </Heading>
          <Box h="400px">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelUsageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="messages" fill="#8884d8" name="Messages" />
                <Bar dataKey="avgResponseTime" fill="#82ca9d" name="Avg Response (s)" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>

        {/* Time Series Chart */}
        <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
          <Heading size="md" mb={6} textAlign="center">
            Message Activity Over Time
          </Heading>
          <Box h="400px">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="messages" stroke="#8884d8" name="Messages" />
                <Line
                  type="monotone"
                  dataKey="conversations"
                  stroke="#82ca9d"
                  name="Conversations"
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Box>

        {/* Hourly Distribution Chart */}
        <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
          <Heading size="md" mb={6} textAlign="center">
            Message Distribution by Hour
          </Heading>
          <Box h="400px">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="messages" fill="#8884d8" name="Messages" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </VStack>
    </Container>
  );
};
