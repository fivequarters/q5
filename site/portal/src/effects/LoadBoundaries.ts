import { getFunctions } from "../lib/Fusebit";
import { FusebitError } from "../components/ErrorBoundary";
import { IFusebitProfile } from "../lib/Settings";

export default function loadBoundaries(
  profile: IFusebitProfile,
  subscriptionId: string | undefined,
  boundaryId: string | undefined,
  data: any,
  onNewData: any
) {
  return () => {
    let cancelled: boolean = false;
    if (
      onNewData &&
      subscriptionId &&
      (!data || !data.boundaries || !data.boundaries[subscriptionId])
    ) {
      (async () => {
        let boundaries: any = data.boundaries || {};
        try {
          boundaries[subscriptionId] = {
            data: await getFunctions(profile, subscriptionId, boundaryId)
          };
        } catch (e) {
          boundaries[subscriptionId] = {
            error: new FusebitError("Error loading boundary information", {
              details:
                (e.status || e.statusCode) === 403
                  ? "The Fusebit account or subscription does not exist or you are not authorized to access it's list of functions."
                  : e.message || "Unknown error."
            })
          };
        }
        !cancelled && onNewData && onNewData({ ...data, boundaries });
      })();
      return () => {
        cancelled = true;
      };
    }
  };
}
