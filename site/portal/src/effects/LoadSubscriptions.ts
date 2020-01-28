import { getSubscriptions } from "../lib/Fusebit";
import { FusebitError } from "../components/ErrorBoundary";
import { IFusebitProfile } from "../lib/Settings";

export default function loadSubscriptions(
  profile: IFusebitProfile,
  data: any,
  onNewData: any
) {
  return () => {
    let cancelled: boolean = false;
    if (!data || !data.subscriptions) {
      (async () => {
        let subscriptions: any;
        try {
          subscriptions = { data: await getSubscriptions(profile) };
          subscriptions.dataHash = (subscriptions.data as any[]).reduce<any>(
            (current, value) => {
              current[value.id] = value;
              return current;
            },
            {}
          );
        } catch (e) {
          subscriptions = {
            error: new FusebitError("Error loading subscription information", {
              details:
                (e.status || e.statusCode) === 403
                  ? "The Fusebit account does not exist or you are not authorized to access it's list of subscriptions."
                  : e.message || "Unknown error."
            })
          };
        }
        !cancelled && onNewData && onNewData({ ...data, subscriptions });
      })();
      return () => {
        cancelled = true;
      };
    }
  };
}
