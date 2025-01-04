import { memo, useEffect, useState } from "react";
import {
  Avatar,
  Box,
  ButtonGroup,
  Button,
  Heading,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelProps,
} from "recharts";
import ComponentMessage from "../ComponentMessage";
import { ProcessedAnalytics, processAnalytics } from "../../../lib/analytics";

type Period = "1H" | "1D" | "1W" | "1M" | "1Y" | "ALL";

function getPeriodLabel(period: Period, context: "button" | "peak" | "normal" = "normal"): string {
  const labels: Record<Period, { normal: string; peak: string }> = {
    "1H": { normal: "hour", peak: "a single hour" },
    "1D": { normal: "day", peak: "a single day" },
    "1W": { normal: "week", peak: "a single week" },
    "1M": { normal: "month", peak: "a single month" },
    "1Y": { normal: "year", peak: "a single year" },
    ALL: { normal: "all time", peak: "any period" },
  };

  const label = context === "peak" ? labels[period].peak : labels[period].normal;

  return context === "button" ? label.charAt(0).toUpperCase() + label.slice(1) : label;
}

const COLORS = {
  chats: "#8884d8",
  messages: "#82ca9d",
  characters: "#F2994A",
};

function formatLargeNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

function Analytics() {
  const [period, setPeriod] = useState<Period>("1M");
  const [analytics, setAnalytics] = useState<ProcessedAnalytics | null>(null);

  useEffect(() => {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case "1H":
        startDate.setHours(endDate.getHours() - 1);
        break;
      case "1D":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "1W":
        startDate.setDate(endDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "1M":
        startDate.setMonth(endDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "1Y":
        startDate.setFullYear(endDate.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "ALL":
        startDate.setFullYear(2019);
        break;
    }

    processAnalytics(startDate, endDate).then(setAnalytics);
  }, [period]);

  const avatar = (
    <Avatar
      size="sm"
      src="/apple-touch-icon.png"
      title="ChatCraft"
      showBorder
      borderColor="gray.100"
      _dark={{ borderColor: "gray.600" }}
    />
  );

  if (!analytics) {
    return null;
  }

  return (
    <ComponentMessage heading="ChatCraft Analytics" avatar={avatar}>
      <VStack spacing={6} w="100%" align="stretch">
        <Box display="flex" justifyContent="flex-end">
          <ButtonGroup isAttached size="sm">
            <Button onClick={() => setPeriod("1H")} colorScheme={period === "1H" ? "blue" : "gray"}>
              {getPeriodLabel("1H", "button")}
            </Button>
            <Button onClick={() => setPeriod("1D")} colorScheme={period === "1D" ? "blue" : "gray"}>
              {getPeriodLabel("1D", "button")}
            </Button>
            <Button onClick={() => setPeriod("1W")} colorScheme={period === "1W" ? "blue" : "gray"}>
              {getPeriodLabel("1W", "button")}
            </Button>
            <Button onClick={() => setPeriod("1M")} colorScheme={period === "1M" ? "blue" : "gray"}>
              {getPeriodLabel("1M", "button")}
            </Button>
            <Button onClick={() => setPeriod("1Y")} colorScheme={period === "1Y" ? "blue" : "gray"}>
              {getPeriodLabel("1Y", "button")}
            </Button>
            <Button
              onClick={() => setPeriod("ALL")}
              colorScheme={period === "ALL" ? "blue" : "gray"}
            >
              {getPeriodLabel("ALL", "button")}
            </Button>
          </ButtonGroup>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8} px={4}>
          <Stat textAlign="center">
            <StatLabel fontSize="md">Total Chats</StatLabel>
            <StatNumber fontSize="3xl">
              {analytics.summary.totals.chats.toLocaleString()}
            </StatNumber>
            <StatHelpText>
              <Text>Peak Activity</Text>
              <Text>
                {analytics.summary.max.chats} chats in {getPeriodLabel(period, "peak")}
              </Text>
            </StatHelpText>
          </Stat>

          <Stat textAlign="center">
            <StatLabel fontSize="md">Total Messages</StatLabel>
            <StatNumber fontSize="3xl">
              {analytics.summary.totals.messages.toLocaleString()}
            </StatNumber>
            <StatHelpText>
              <Text>Average Activity</Text>
              <Text>{analytics.summary.averages.messagesPerChat} messages per chat</Text>
            </StatHelpText>
          </Stat>

          <Stat textAlign="center">
            <StatLabel fontSize="md">Total Characters</StatLabel>
            <StatNumber fontSize="3xl">
              {formatLargeNumber(analytics.summary.totals.characters)}
            </StatNumber>
            <StatHelpText>
              <Text>Average Length</Text>
              <Text>
                {formatLargeNumber(Number(analytics.summary.averages.charactersPerMessage))} chars
                per message
              </Text>
            </StatHelpText>
          </Stat>
        </SimpleGrid>

        <Box h="300px">
          <Heading size="sm" mb={4}>
            Chat Overview
          </Heading>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics.timeSeriesData}>
              <XAxis dataKey="period" tick={false} height={20} />
              <YAxis
                yAxisId="left"
                orientation="left"
                label={{
                  value: "Chats & Messages",
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: "middle" },
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                label={{
                  value: "Characters (Thousands)",
                  angle: 90,
                  position: "insideRight",
                  style: { textAnchor: "middle" },
                }}
              />
              <Tooltip
                labelFormatter={(label) => {
                  const date = new Date(label);
                  switch (period) {
                    case "1H":
                      return date.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                    case "1D":
                    case "1W":
                    case "1M":
                      return date.toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      });
                    default:
                      return date.toLocaleDateString([], {
                        month: "short",
                        year: "numeric",
                      });
                  }
                }}
                formatter={(value, name: string) => {
                  if (name === "characters") {
                    return [`${value}K characters`, "Characters"];
                  }
                  return [value, name.charAt(0).toUpperCase() + name.slice(1)];
                }}
              />
              <Legend verticalAlign="top" height={36} />
              <Line
                type="monotone"
                dataKey="chats"
                stroke={COLORS.chats}
                name="Chats"
                yAxisId="left"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="messages"
                stroke={COLORS.messages}
                name="Messages"
                yAxisId="left"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="characters"
                stroke={COLORS.characters}
                name="Characters (K)"
                yAxisId="right"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>

        <Box h="300px">
          <Heading size="sm" mb={4}>
            Model Usage
          </Heading>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={analytics.modelUsage}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                domain={[0, "dataMax"]}
                padding={{ left: 0, right: 12 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                tick={{ fontSize: 12 }}
                interval={0}
              />
              <Tooltip formatter={(value) => [`${value} messages`, "Usage"]} />
              <Bar
                dataKey="value"
                fill="#0088FE"
                isAnimationActive={false}
                label={(props: LabelProps) => {
                  const { x, y, width, value } = props;
                  const total = analytics.modelUsage.reduce((sum, model) => sum + model.value, 0);
                  const percentage = ((Number(value) / total) * 100).toFixed(1);

                  return (
                    <text
                      x={Number(x) + Number(width) + 5}
                      y={Number(y) + 12}
                      fill="#666666"
                      fontSize={12}
                      textAnchor="start"
                    >
                      {`${percentage}%`}
                    </text>
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </VStack>
    </ComponentMessage>
  );
}

export default memo(Analytics);
