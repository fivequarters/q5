import React, { useState, useEffect } from "react";
import AppBar from "@material-ui/core/AppBar";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import SubscriptionActivity from "./SubscriptionActivity";
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import ToggleButton from '@material-ui/lab/ToggleButton';
import ms from "ms";

// Duplicated; not sure how to declare externally.
enum BucketWidths {
  Minute = "1m",
  Hour = "1h",
  Day = "1d",
  Week = "1w",
  Month = "1M",
  Quarter = "1q",
  Year = "1y",
};

interface IDateInterval {
  width: BucketWidths;
  timeStart: Date;
  timeEnd: Date;
};

interface IParams {
  accountId?: string;
  subscriptionId?: string;
  boundaryId?: string;
  functionId?: string;
};

interface IProps {
  params: IParams;
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: any;
  value: any;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={value !== index} id={`simple-tabpanel-${index}`} {...other}>
      {value === index && <Box p={3}>{children}</Box>}
    </div>
  );
}

const MonitoringPanel: React.FC<IProps> = (props) => {
  const [value, setValue] = useState(0);
  const [ interval, setInterval ] = useState<IDateInterval>({timeStart: new Date(Date.now() - ms('7d')), timeEnd: new Date(), width: BucketWidths.Day});
  const [ eventRange, setEventRange ] = useState<IDateInterval|null>(null);
  const [ activeCodeList, setActiveCodeList ] = useState<any>([200, 300, 400]);
  const [ activeCode, setActiveCode ] = useState<number|null>(200);

  return (
    <div>
      {/* Create the button group, one button for each of the different bucket sizes. */}
      <ToggleButtonGroup size="small" exclusive={true} onChange={(e, v) => setInterval({...interval, width: v})} value={interval.width}>
        {
          Object.keys(BucketWidths).map((width) => {
            let tWidth: keyof typeof BucketWidths = width as keyof typeof BucketWidths;
            return (<ToggleButton key={width} value={BucketWidths[tWidth]}>{width}</ToggleButton>);
          })
        }
      </ToggleButtonGroup>

      {/* Show the tab bar for each of the different visualizations */}
      <AppBar position="static">
        <Tabs value={value} onChange={(e, v) => setValue(v)}>
          <Tab label="Summary" />
          <Tab label="Results" />
          <Tab label="Latency" />
        </Tabs>
      </AppBar>
      <TabPanel value={value} index={0}>
        Item One
      </TabPanel>

      {/* Render the various graphs and pages. */}
      <TabPanel value={value} index={1}>
        <SubscriptionActivity code="codeactivityhg" label="HTTP Responses" params={props.params} interval={interval} setEventRange={setEventRange} setActiveCodeList={setActiveCodeList} />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <SubscriptionActivity code="codelatencyhg" label="HTTP Latency" params={props.params} interval={interval} setEventRange={setEventRange} setActiveCodeList={setActiveCodeList} />
      </TabPanel>
      <ToggleButtonGroup size="small" exclusive={true} onChange={(e, v) => setActiveCode(v)} value={activeCode}>
        {
          activeCodeList.map((code:number) => {
            return (<ToggleButton key={code} value={code}>{code}</ToggleButton>);
          })
        }
      </ToggleButtonGroup>
      {/*<HTTPEventLogList params={props.params} interval={interval} activeCode={activeCode} /> */}
    </div>
  );
}
// XXX probably also need to tweak the timestamp callback; I don't think that's working quite right.  Or maybe
// it's just unused; hard to tell at the moment.   Yeah, it's just unused.
export {
  MonitoringPanel
};
