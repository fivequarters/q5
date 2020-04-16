import React, { useState } from "react";
import AppBar from "@material-ui/core/AppBar";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Box from "@material-ui/core/Box";
import MonitorGraph from "./MonitorGraph";
import HTTPActivityLog from "./HTTPActivityLog";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import ToggleButton from "@material-ui/lab/ToggleButton";
import ms from "ms";
import { useProfile } from "./ProfileProvider";

// Duplicated; not sure how to declare externally.
enum BucketWidths {
  Minute = "1m",
  Hour = "1h",
  Day = "1d",
  Week = "1w",
  Month = "1M",
  Quarter = "1q",
  Year = "1y"
}

interface IDateInterval {
  width: BucketWidths;
  timeStart: Date;
  timeEnd: Date;
}

interface IParams {
  accountId?: string;
  subscriptionId?: string;
  boundaryId?: string;
  functionId?: string;
}

interface IProps {
  params: IParams;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: any;
  graphIndex: any;
}

const availableGraphs = [
  {
    label: "HTTP Responses",
    code: "codeactivityhg"
  },
  {
    label: "HTTP Latency",
    code: "codelatencyhg"
  }
];

const TabPanel = (props: TabPanelProps) => {
  const { children, graphIndex, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={graphIndex !== index} id={`simple-tabpanel-${index}`} {...other}>
      {graphIndex === index && <Box p={3}>{children}</Box>}
    </div>
  );
};

const MonitorPanel: React.FC<IProps> = props => {
  const { profile } = useProfile();
  const [graphIndex, setGraphIndex] = useState(0);
  const [interval, setInterval] = useState<IDateInterval>({
    timeStart: new Date(Date.now() - ms("7d")),
    timeEnd: new Date(),
    width: BucketWidths.Day
  });
  const [eventRange, setEventRange] = useState<IDateInterval | null>(null);
  const [activeCodeList, setActiveCodeList] = useState<any>([200, 300, 400]);
  const [activeCode, setActiveCode] = useState<number | null>(200);

  // Create a common URL wart to pass to the sub-components
  const params = props.params;

  let warts = [
    params.accountId ? `account/${params.accountId}` : "",
    params.subscriptionId ? `subscription/${params.subscriptionId}` : "",
    params.boundaryId ? `boundary/${params.boundaryId}` : "",
    params.functionId ? `function/${params.functionId}` : ""
  ].filter(x => x);

  const urlWart = `${profile.baseUrl}/v1/` + warts.join("/");

  // Return the div.
  return (
    <div>
      {/* Create the button group, one button for each of the different bucket sizes. */}
      <ToggleButtonGroup
        size="small"
        exclusive={true}
        onChange={(e, v) => setInterval({ ...interval, width: v })}
        value={interval.width}
      >
        {Object.keys(BucketWidths).map(width => {
          let tWidth: keyof typeof BucketWidths = width as keyof typeof BucketWidths;
          return (
            <ToggleButton key={width} value={BucketWidths[tWidth]}>
              {width}
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>

      {/* Show the tab bar for each of the different visualizations */}
      <AppBar position="static">
        <Tabs value={graphIndex} onChange={(e, v) => setGraphIndex(v)}>
          <Tab label="Summary" />
          {availableGraphs.map(graph => {
            return <Tab key={graph.label} label={graph.label} />;
          })}
        </Tabs>
      </AppBar>
      <TabPanel graphIndex={graphIndex} index={0}>
        Item One
      </TabPanel>

      {/* Show the various graphs available. */}
      {availableGraphs.map((graph, n) => {
        return (
          <TabPanel key={n + 1} graphIndex={graphIndex} index={n + 1}>
            <MonitorGraph
              profile={profile}
              code={graph.code}
              label={graph.label}
              urlWart={urlWart}
              interval={interval}
              setEventRange={setEventRange}
              setActiveCodeList={setActiveCodeList}
            />
          </TabPanel>
        );
      })}

      {/* Display the events that occurred in the selected time period. */}
      <ToggleButtonGroup
        size="small"
        exclusive={true}
        onChange={(e, v) => setActiveCode(v)}
        value={activeCode}
      >
        {activeCodeList.map((code: number) => {
          return (
            <ToggleButton key={code} value={code}>
              {code}
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>
      <HTTPActivityLog profile={profile} urlWart={urlWart} interval={eventRange} activeCode={activeCode} />
    </div>
  );
};
export { MonitorPanel };
