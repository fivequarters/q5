/**
 * A class that defines all Web API methods, their arguments type, their response type, and binds those methods to the
 * `apiCall` class method.
 */
 export declare abstract class Methods extends EventEmitter<WebClientEvent> {
  protected constructor();
  abstract apiCall(method: string, options?: WebAPICallOptions): Promise<WebAPICallResult>;
  readonly admin: {
      apps: {
          approve: Method<AdminAppsApproveArguments, AdminAppsApproveResponse>;
          approved: {
              list: Method<AdminAppsApprovedListArguments, AdminAppsApprovedListResponse>;
          };
          clearResolution: Method<AdminAppsClearResolutionArguments, AdminAppsClearResolutionResponse>;
          requests: {
              list: Method<AdminAppsRequestsListArguments, AdminAppsRequestsListResponse>;
          };
          restrict: Method<AdminAppsRestrictArguments, AdminAppsRestrictResponse>;
          restricted: {
              list: Method<AdminAppsRestrictedListArguments, AdminAppsRestrictedListResponse>;
          };
          uninstall: Method<AdminAppsUninstallArguments, AdminAppsUninstallResponse>;
      };
      auth: {
          policy: {
              assignEntities: Method<AdminAuthPolicyAssignEntitiesArguments, AdminAuthPolicyAssignEntitiesResponse>;
              getEntities: Method<AdminAuthPolicyGetEntitiesArguments, AdminAuthPolicyGetEntitiesResponse>;
              removeEntities: Method<AdminAuthPolicyRemoveEntitiesArguments, AdminAuthPolicyRemoveEntitiesResponse>;
          };
      };
      barriers: {
          create: Method<AdminBarriersCreateArguments, AdminBarriersCreateResponse>;
          delete: Method<AdminBarriersDeleteArguments, AdminBarriersDeleteResponse>;
          list: Method<AdminBarriersListArguments, AdminBarriersListResponse>;
          update: Method<AdminBarriersUpdateArguments, AdminBarriersUpdateResponse>;
      };
      conversations: {
          archive: Method<AdminConversationsArchiveArguments, AdminConversationsArchiveResponse>;
          convertToPrivate: Method<AdminConversationsConvertToPrivateArguments, AdminConversationsConvertToPrivateResponse>;
          create: Method<AdminConversationsCreateArguments, AdminConversationsCreateResponse>;
          delete: Method<AdminConversationsDeleteArguments, AdminConversationsDeleteResponse>;
          disconnectShared: Method<AdminConversationsDisconnectSharedArguments, AdminConversationsDisconnectSharedResponse>;
          ekm: {
              listOriginalConnectedChannelInfo: Method<AdminConversationsEKMListOriginalConnectedChannelInfoArguments, AdminConversationsEkmListOriginalConnectedChannelInfoResponse>;
          };
          getConversationPrefs: Method<AdminConversationsGetConversationPrefsArguments, AdminConversationsGetConversationPrefsResponse>;
          getTeams: Method<AdminConversationsGetTeamsArguments, AdminConversationsGetTeamsResponse>;
          invite: Method<AdminConversationsInviteArguments, AdminConversationsInviteResponse>;
          rename: Method<AdminConversationsRenameArguments, AdminConversationsRenameResponse>;
          restrictAccess: {
              addGroup: Method<AdminConversationsRestrictAccessAddGroupArguments, AdminConversationsRestrictAccessAddGroupResponse>;
              listGroups: Method<AdminConversationsRestrictAccessListGroupsArguments, AdminConversationsRestrictAccessListGroupsResponse>;
              removeGroup: Method<AdminConversationsRestrictAccessRemoveGroupArguments, AdminConversationsRestrictAccessRemoveGroupResponse>;
          };
          search: Method<AdminConversationsSearchArguments, AdminConversationsSearchResponse>;
          setConversationPrefs: Method<AdminConversationsSetConversationPrefsArguments, AdminConversationsSetConversationPrefsResponse>;
          setTeams: Method<AdminConversationsSetTeamsArguments, AdminConversationsSetTeamsResponse>;
          unarchive: Method<AdminConversationsUnarchiveArguments, AdminConversationsUnarchiveResponse>;
      };
      emoji: {
          add: Method<AdminEmojiAddArguments, AdminEmojiAddResponse>;
          addAlias: Method<AdminEmojiAddAliasArguments, AdminEmojiAddAliasResponse>;
          list: Method<AdminEmojiListArguments, AdminEmojiListResponse>;
          remove: Method<AdminEmojiRemoveArguments, AdminEmojiRemoveResponse>;
          rename: Method<AdminEmojiRenameArguments, AdminEmojiRenameResponse>;
      };
      inviteRequests: {
          approve: Method<AdminInviteRequestsApproveArguments, AdminInviteRequestsApproveResponse>;
          approved: {
              list: Method<AdminInviteRequestsApprovedListArguments, AdminInviteRequestsApprovedListResponse>;
          };
          denied: {
              list: Method<AdminInviteRequestsDeniedListArguments, AdminInviteRequestsDeniedListResponse>;
          };
          deny: Method<AdminInviteRequestsDenyArguments, AdminInviteRequestsDenyResponse>;
          list: Method<AdminInviteRequestsListArguments, AdminInviteRequestsListResponse>;
      };
      teams: {
          admins: {
              list: Method<AdminTeamsAdminsListArguments, AdminTeamsAdminsListResponse>;
          };
          create: Method<AdminTeamsCreateArguments, AdminTeamsCreateResponse>;
          list: Method<AdminTeamsListArguments, AdminTeamsListResponse>;
          owners: {
              list: Method<AdminTeamsOwnersListArguments, AdminTeamsOwnersListResponse>;
          };
          settings: {
              info: Method<AdminTeamsSettingsInfoArguments, AdminTeamsSettingsInfoResponse>;
              setDefaultChannels: Method<AdminTeamsSettingsSetDefaultChannelsArguments, AdminTeamsSettingsSetDefaultChannelsResponse>;
              setDescription: Method<AdminTeamsSettingsSetDescriptionArguments, AdminTeamsSettingsSetDescriptionResponse>;
              setDiscoverability: Method<AdminTeamsSettingsSetDiscoverabilityArguments, AdminTeamsSettingsSetDiscoverabilityResponse>;
              setIcon: Method<AdminTeamsSettingsSetIconArguments, AdminTeamsSettingsSetIconResponse>;
              setName: Method<AdminTeamsSettingsSetNameArguments, AdminTeamsSettingsSetNameResponse>;
          };
      };
      usergroups: {
          addChannels: Method<AdminUsergroupsAddChannelsArguments, AdminUsergroupsAddChannelsResponse>;
          addTeams: Method<AdminUsergroupsAddTeamsArguments, AdminUsergroupsAddTeamsResponse>;
          listChannels: Method<AdminUsergroupsListChannelsArguments, AdminUsergroupsListChannelsResponse>;
          removeChannels: Method<AdminUsergroupsRemoveChannelsArguments, AdminUsergroupsRemoveChannelsResponse>;
      };
      users: {
          assign: Method<AdminUsersAssignArguments, AdminUsersAssignResponse>;
          invite: Method<AdminUsersInviteArguments, AdminUsersInviteResponse>;
          list: Method<AdminUsersListArguments, AdminUsersListResponse>;
          remove: Method<AdminUsersRemoveArguments, AdminUsersRemoveResponse>;
          session: {
              list: Method<AdminUsersSessionListArguments, AdminUsersSessionListResponse>;
              reset: Method<AdminUsersSessionResetArguments, AdminUsersSessionResetResponse>;
              invalidate: Method<AdminUsersSessionInvalidateArguments, AdminUsersSessionInvalidateResponse>;
              getSettings: Method<AdminUsersSessionGetSettingsArguments, AdminUsersSessionGetSettingsResponse>;
              setSettings: Method<AdminUsersSessionSetSettingsArguments, AdminUsersSessionSetSettingsResponse>;
              clearSettings: Method<AdminUsersSessionClearSettingsArguments, AdminUsersSessionClearSettingsResponse>;
          };
          setAdmin: Method<AdminUsersSetAdminArguments, AdminUsersSetAdminResponse>;
          setExpiration: Method<AdminUsersSetExpirationArguments, AdminUsersSetExpirationResponse>;
          setOwner: Method<AdminUsersSetOwnerArguments, AdminUsersSetOwnerResponse>;
          setRegular: Method<AdminUsersSetRegularArguments, AdminUsersSetRegularResponse>;
      };
  };
  readonly api: {
      test: Method<APITestArguments, ApiTestResponse>;
  };
  readonly apps: {
      connections: {
          open: Method<AppsConnectionsOpenArguments, AppsConnectionsOpenResponse>;
      };
      event: {
          authorizations: {
              list: Method<AppsEventAuthorizationsListArguments, AppsEventAuthorizationsListResponse>;
          };
      };
      uninstall: Method<AppsUninstallArguments, AppsUninstallResponse>;
  };
  readonly auth: {
      revoke: Method<AuthRevokeArguments, AuthRevokeResponse>;
      teams: {
          list: Method<AuthTeamsListArguments, AuthTeamsListResponse>;
      };
      test: Method<AuthTestArguments, AuthTestResponse>;
  };
  readonly bots: {
      info: Method<BotsInfoArguments, BotsInfoResponse>;
  };
  readonly calls: {
      add: Method<CallsAddArguments, CallsAddResponse>;
      end: Method<CallsEndArguments, CallsEndResponse>;
      info: Method<CallsInfoArguments, CallsInfoResponse>;
      update: Method<CallsUpdateArguments, CallsUpdateResponse>;
      participants: {
          add: Method<CallsParticipantsAddArguments, CallsParticipantsAddResponse>;
          remove: Method<CallsParticipantsRemoveArguments, CallsParticipantsRemoveResponse>;
      };
  };
  readonly chat: {
      delete: Method<ChatDeleteArguments, ChatDeleteResponse>;
      deleteScheduledMessage: Method<ChatDeleteScheduledMessageArguments, ChatDeleteScheduledMessageResponse>;
      getPermalink: Method<ChatGetPermalinkArguments, ChatGetPermalinkResponse>;
      meMessage: Method<ChatMeMessageArguments, ChatMeMessageResponse>;
      postEphemeral: Method<ChatPostEphemeralArguments, ChatPostEphemeralResponse>;
      postMessage: Method<ChatPostMessageArguments, ChatPostMessageResponse>;
      scheduleMessage: Method<ChatScheduleMessageArguments, ChatScheduleMessageResponse>;
      scheduledMessages: {
          list: Method<ChatScheduledMessagesListArguments, ChatScheduledMessagesListResponse>;
      };
      unfurl: Method<ChatUnfurlArguments, ChatUnfurlResponse>;
      update: Method<ChatUpdateArguments, ChatUpdateResponse>;
  };
  readonly conversations: {
      acceptSharedInvite: Method<ConversationsAcceptSharedInviteArguments, ConversationsAcceptSharedInviteResponse>;
      approveSharedInvite: Method<ConversationsApproveSharedInviteArguments, ConversationsApproveSharedInviteResponse>;
      archive: Method<ConversationsArchiveArguments, ConversationsArchiveResponse>;
      close: Method<ConversationsCloseArguments, ConversationsCloseResponse>;
      create: Method<ConversationsCreateArguments, ConversationsCreateResponse>;
      declineSharedInvite: Method<ConversationsDeclineSharedInviteArguments, ConversationsDeclineSharedInviteResponse>;
      history: Method<ConversationsHistoryArguments, ConversationsHistoryResponse>;
      info: Method<ConversationsInfoArguments, ConversationsInfoResponse>;
      invite: Method<ConversationsInviteArguments, ConversationsInviteResponse>;
      inviteShared: Method<ConversationsInviteSharedArguments, ConversationsInviteSharedResponse>;
      join: Method<ConversationsJoinArguments, ConversationsJoinResponse>;
      kick: Method<ConversationsKickArguments, ConversationsKickResponse>;
      leave: Method<ConversationsLeaveArguments, ConversationsLeaveResponse>;
      list: Method<ConversationsListArguments, ConversationsListResponse>;
      listConnectInvites: Method<ConversationsListConnectInvitesArguments, ConversationsListConnectInvitesResponse>;
      mark: Method<ConversationsMarkArguments, ConversationsMarkResponse>;
      members: Method<ConversationsMembersArguments, ConversationsMembersResponse>;
      open: Method<ConversationsOpenArguments, ConversationsOpenResponse>;
      rename: Method<ConversationsRenameArguments, ConversationsRenameResponse>;
      replies: Method<ConversationsRepliesArguments, ConversationsRepliesResponse>;
      setPurpose: Method<ConversationsSetPurposeArguments, ConversationsSetPurposeResponse>;
      setTopic: Method<ConversationsSetTopicArguments, ConversationsSetTopicResponse>;
      unarchive: Method<ConversationsUnarchiveArguments, ConversationsUnarchiveResponse>;
  };
  readonly dialog: {
      open: Method<DialogOpenArguments, DialogOpenResponse>;
  };
  readonly dnd: {
      endDnd: Method<DndEndDndArguments, DndEndDndResponse>;
      endSnooze: Method<DndEndSnoozeArguments, DndEndSnoozeResponse>;
      info: Method<DndInfoArguments, DndInfoResponse>;
      setSnooze: Method<DndSetSnoozeArguments, DndSetSnoozeResponse>;
      teamInfo: Method<DndTeamInfoArguments, DndTeamInfoResponse>;
  };
  readonly emoji: {
      list: Method<EmojiListArguments, EmojiListResponse>;
  };
  readonly files: {
      delete: Method<FilesDeleteArguments, FilesDeleteResponse>;
      info: Method<FilesInfoArguments, FilesInfoResponse>;
      list: Method<FilesListArguments, FilesListResponse>;
      revokePublicURL: Method<FilesRevokePublicURLArguments, FilesRevokePublicURLResponse>;
      sharedPublicURL: Method<FilesSharedPublicURLArguments, FilesSharedPublicURLResponse>;
      upload: Method<FilesUploadArguments, FilesUploadResponse>;
      comments: {
          delete: Method<FilesCommentsDeleteArguments, FilesCommentsDeleteResponse>;
      };
      remote: {
          info: Method<FilesRemoteInfoArguments, FilesRemoteInfoResponse>;
          list: Method<FilesRemoteListArguments, FilesRemoteListResponse>;
          add: Method<FilesRemoteAddArguments, FilesRemoteAddResponse>;
          update: Method<FilesRemoteUpdateArguments, FilesRemoteUpdateResponse>;
          remove: Method<FilesRemoteRemoveArguments, FilesRemoteRemoveResponse>;
          share: Method<FilesRemoteShareArguments, FilesRemoteShareResponse>;
      };
  };
  readonly migration: {
      exchange: Method<MigrationExchangeArguments, MigrationExchangeResponse>;
  };
  readonly oauth: {
      access: Method<OAuthAccessArguments, OauthAccessResponse>;
      v2: {
          access: Method<OAuthV2AccessArguments, OauthV2AccessResponse>;
          exchange: Method<OAuthV2ExchangeArguments, OauthV2ExchangeResponse>;
      };
  };
  readonly openid: {
      connect: {
          token: Method<OpenIDConnectTokenArguments, OpenIDConnectTokenResponse>;
          userInfo: Method<OpenIDConnectUserInfoArguments, OpenIDConnectUserInfoResponse>;
      };
  };
  readonly pins: {
      add: Method<PinsAddArguments, PinsAddResponse>;
      list: Method<PinsListArguments, PinsListResponse>;
      remove: Method<PinsRemoveArguments, PinsRemoveResponse>;
  };
  readonly reactions: {
      add: Method<ReactionsAddArguments, ReactionsAddResponse>;
      get: Method<ReactionsGetArguments, ReactionsGetResponse>;
      list: Method<ReactionsListArguments, ReactionsListResponse>;
      remove: Method<ReactionsRemoveArguments, ReactionsRemoveResponse>;
  };
  readonly reminders: {
      add: Method<RemindersAddArguments, RemindersAddResponse>;
      complete: Method<RemindersCompleteArguments, RemindersCompleteResponse>;
      delete: Method<RemindersDeleteArguments, RemindersDeleteResponse>;
      info: Method<RemindersInfoArguments, RemindersInfoResponse>;
      list: Method<RemindersListArguments, RemindersListResponse>;
  };
  readonly rtm: {
      connect: Method<RTMConnectArguments, RtmConnectResponse>;
      start: Method<RTMStartArguments, RtmStartResponse>;
  };
  readonly search: {
      all: Method<SearchAllArguments, SearchAllResponse>;
      files: Method<SearchFilesArguments, SearchFilesResponse>;
      messages: Method<SearchMessagesArguments, SearchMessagesResponse>;
  };
  readonly stars: {
      add: Method<StarsAddArguments, StarsAddResponse>;
      list: Method<StarsListArguments, StarsListResponse>;
      remove: Method<StarsRemoveArguments, StarsRemoveResponse>;
  };
  readonly team: {
      accessLogs: Method<TeamAccessLogsArguments, TeamAccessLogsResponse>;
      billableInfo: Method<TeamBillableInfoArguments, TeamBillableInfoResponse>;
      info: Method<TeamInfoArguments, TeamInfoResponse>;
      integrationLogs: Method<TeamIntegrationLogsArguments, TeamIntegrationLogsResponse>;
      profile: {
          get: Method<TeamProfileGetArguments, TeamProfileGetResponse>;
      };
  };
  readonly usergroups: {
      create: Method<UsergroupsCreateArguments, UsergroupsCreateResponse>;
      disable: Method<UsergroupsDisableArguments, UsergroupsDisableResponse>;
      enable: Method<UsergroupsEnableArguments, UsergroupsEnableResponse>;
      list: Method<UsergroupsListArguments, UsergroupsListResponse>;
      update: Method<UsergroupsUpdateArguments, UsergroupsUpdateResponse>;
      users: {
          list: Method<UsergroupsUsersListArguments, UsergroupsUsersListResponse>;
          update: Method<UsergroupsUsersUpdateArguments, UsergroupsUsersUpdateResponse>;
      };
  };
  readonly users: {
      conversations: Method<UsersConversationsArguments, UsersConversationsResponse>;
      deletePhoto: Method<UsersDeletePhotoArguments, UsersDeletePhotoResponse>;
      getPresence: Method<UsersGetPresenceArguments, UsersGetPresenceResponse>;
      identity: Method<UsersIdentityArguments, UsersIdentityResponse>;
      info: Method<UsersInfoArguments, UsersInfoResponse>;
      list: Method<UsersListArguments, UsersListResponse>;
      lookupByEmail: Method<UsersLookupByEmailArguments, UsersLookupByEmailResponse>;
      setPhoto: Method<UsersSetPhotoArguments, UsersSetPhotoResponse>;
      setPresence: Method<UsersSetPresenceArguments, UsersSetPresenceResponse>;
      profile: {
          get: Method<UsersProfileGetArguments, UsersProfileGetResponse>;
          set: Method<UsersProfileSetArguments, UsersProfileSetResponse>;
      };
  };
  readonly views: {
      open: Method<ViewsOpenArguments, ViewsOpenResponse>;
      publish: Method<ViewsPublishArguments, ViewsPublishResponse>;
      push: Method<ViewsPushArguments, ViewsPushResponse>;
      update: Method<ViewsUpdateArguments, ViewsUpdateResponse>;
  };
  readonly workflows: {
      stepCompleted: Method<WorkflowsStepCompletedArguments, WorkflowsStepCompletedResponse>;
      stepFailed: Method<WorkflowsStepFailedArguments, WorkflowsStepFailedResponse>;
      updateStep: Method<WorkflowsUpdateStepArguments, WorkflowsUpdateStepResponse>;
  };
  readonly channels: {
      archive: Method<ChannelsArchiveArguments, WebAPICallResult>;
      create: Method<ChannelsCreateArguments, WebAPICallResult>;
      history: Method<ChannelsHistoryArguments, WebAPICallResult>;
      info: Method<ChannelsInfoArguments, WebAPICallResult>;
      invite: Method<ChannelsInviteArguments, WebAPICallResult>;
      join: Method<ChannelsJoinArguments, WebAPICallResult>;
      kick: Method<ChannelsKickArguments, WebAPICallResult>;
      leave: Method<ChannelsLeaveArguments, WebAPICallResult>;
      list: Method<ChannelsListArguments, WebAPICallResult>;
      mark: Method<ChannelsMarkArguments, WebAPICallResult>;
      rename: Method<ChannelsRenameArguments, WebAPICallResult>;
      replies: Method<ChannelsRepliesArguments, WebAPICallResult>;
      setPurpose: Method<ChannelsSetPurposeArguments, WebAPICallResult>;
      setTopic: Method<ChannelsSetTopicArguments, WebAPICallResult>;
      unarchive: Method<ChannelsUnarchiveArguments, WebAPICallResult>;
  };
  readonly groups: {
      archive: Method<GroupsArchiveArguments, WebAPICallResult>;
      create: Method<GroupsCreateArguments, WebAPICallResult>;
      createChild: Method<GroupsCreateChildArguments, WebAPICallResult>;
      history: Method<GroupsHistoryArguments, WebAPICallResult>;
      info: Method<GroupsInfoArguments, WebAPICallResult>;
      invite: Method<GroupsInviteArguments, WebAPICallResult>;
      kick: Method<GroupsKickArguments, WebAPICallResult>;
      leave: Method<GroupsLeaveArguments, WebAPICallResult>;
      list: Method<GroupsListArguments, WebAPICallResult>;
      mark: Method<GroupsMarkArguments, WebAPICallResult>;
      open: Method<GroupsOpenArguments, WebAPICallResult>;
      rename: Method<GroupsRenameArguments, WebAPICallResult>;
      replies: Method<GroupsRepliesArguments, WebAPICallResult>;
      setPurpose: Method<GroupsSetPurposeArguments, WebAPICallResult>;
      setTopic: Method<GroupsSetTopicArguments, WebAPICallResult>;
      unarchive: Method<GroupsUnarchiveArguments, WebAPICallResult>;
  };
  readonly im: {
      close: Method<IMCloseArguments, WebAPICallResult>;
      history: Method<IMHistoryArguments, WebAPICallResult>;
      list: Method<IMListArguments, WebAPICallResult>;
      mark: Method<IMMarkArguments, WebAPICallResult>;
      open: Method<IMOpenArguments, WebAPICallResult>;
      replies: Method<IMRepliesArguments, WebAPICallResult>;
  };
  readonly mpim: {
      close: Method<MPIMCloseArguments, WebAPICallResult>;
      history: Method<MPIMHistoryArguments, WebAPICallResult>;
      list: Method<MPIMListArguments, WebAPICallResult>;
      mark: Method<MPIMMarkArguments, WebAPICallResult>;
      open: Method<MPIMOpenArguments, WebAPICallResult>;
      replies: Method<MPIMRepliesArguments, WebAPICallResult>;
  };
}
/**
* Generic method definition
*/
export default interface Method<MethodArguments extends WebAPICallOptions, MethodResult extends WebAPICallResult = WebAPICallResult> {
  (options?: MethodArguments): Promise<MethodResult>;
}
export interface TokenOverridable {
  token?: string;
}
export interface LocaleAware {
  include_locale?: boolean;
}
export interface Searchable {
  query: string;
  highlight?: boolean;
  sort: 'score' | 'timestamp';
  sort_dir: 'asc' | 'desc';
  team_id?: string;
}
export declare const cursorPaginationEnabledMethods: Set<string>;
export interface CursorPaginationEnabled {
  limit?: number;
  cursor?: string;
}
export interface TimelinePaginationEnabled {
  oldest?: string;
  latest?: string;
  inclusive?: boolean;
}
export interface TraditionalPagingEnabled {
  page?: number;
  count?: number;
}
export interface AdminAppsApproveArguments extends WebAPICallOptions, TokenOverridable {
  app_id?: string;
  request_id?: string;
  team_id?: string;
}
export interface AdminAppsApprovedListArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
  team_id?: string;
  enterprise_id?: string;
}
export interface AdminAppsClearResolutionArguments extends WebAPICallOptions {
  app_id: string;
  enterprise_id?: string;
  team_id?: string;
}
export interface AdminAppsRequestsListArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
  team_id?: string;
}
export interface AdminAppsRestrictArguments extends WebAPICallOptions, TokenOverridable {
  app_id?: string;
  request_id?: string;
  team_id?: string;
}
export interface AdminAppsRestrictedListArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
  team_id?: string;
  enterprise_id?: string;
}
export interface AdminAppsUninstallArguments extends WebAPICallOptions {
  app_id: string;
  enterprise_id?: string;
  team_ids?: string[];
}
export interface AdminAuthPolicyAssignEntitiesArguments extends WebAPICallOptions, TokenOverridable {
  entity_ids: string[];
  entity_type: string;
  policy_name: string;
}
export interface AdminAuthPolicyGetEntitiesArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
  policy_name: string;
  entity_type?: string;
}
export interface AdminAuthPolicyRemoveEntitiesArguments extends WebAPICallOptions, TokenOverridable {
  entity_ids: string[];
  entity_type: string;
  policy_name: string;
}
export interface AdminBarriersCreateArguments extends WebAPICallOptions, TokenOverridable {
  barriered_from_usergroup_ids: string[];
  primary_usergroup_id: string;
  restricted_subjects: string[];
}
export interface AdminBarriersDeleteArguments extends WebAPICallOptions, TokenOverridable {
  barrier_id: string;
}
export interface AdminBarriersListArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
}
export interface AdminBarriersUpdateArguments extends WebAPICallOptions, TokenOverridable {
  barrier_id: string;
  barriered_from_usergroup_ids: string[];
  primary_usergroup_id: string;
  restricted_subjects: string[];
}
export interface AdminConversationsArchiveArguments extends WebAPICallOptions, TokenOverridable {
  channel_id: string;
}
export interface AdminConversationsConvertToPrivateArguments extends WebAPICallOptions, TokenOverridable {
  channel_id: string;
}
export interface AdminConversationsCreateArguments extends WebAPICallOptions, TokenOverridable {
  is_private: boolean;
  name: string;
  description?: string;
  org_wide?: boolean;
  team_id?: string;
}
export interface AdminConversationsDeleteArguments extends WebAPICallOptions, TokenOverridable {
  channel_id: string;
}
export interface AdminConversationsDisconnectSharedArguments extends WebAPICallOptions, TokenOverridable {
  channel_id: string;
  leaving_team_ids?: string[];
}
export interface AdminConversationsEKMListOriginalConnectedChannelInfoArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
  channel_ids?: string[];
  team_ids?: string[];
}
export interface AdminConversationsGetConversationPrefsArguments extends WebAPICallOptions, TokenOverridable {
  channel_id: string;
}
export interface AdminConversationsGetTeamsArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
  channel_id: string;
}
export interface AdminConversationsInviteArguments extends WebAPICallOptions, TokenOverridable {
  channel_id: string;
  user_ids: string[];
}
export interface AdminConversationsRenameArguments extends WebAPICallOptions, TokenOverridable {
  channel_id: string;
  name: string;
}
export interface AdminConversationsRestrictAccessAddGroupArguments extends WebAPICallOptions, TokenOverridable {
  channel_id: string;
  group_id: string;
  team_id?: string;
}
export interface AdminConversationsRestrictAccessListGroupsArguments extends WebAPICallOptions, TokenOverridable {
  channel_id: string;
  team_id?: string;
}
export interface AdminConversationsRestrictAccessRemoveGroupArguments extends WebAPICallOptions, TokenOverridable {
  channel_id: string;
  group_id: string;
  team_id: string;
}
export interface AdminConversationsSearchArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
  query?: string;
  search_channel_types?: string[];
  sort?: 'relevant' | 'name' | 'member_count' | 'created';
  sort_dir?: 'asc' | 'desc';
  team_ids?: string[];
}
export interface AdminConversationsSetConversationPrefsArguments extends WebAPICallOptions, TokenOverridable {
  channel_id: string;
  prefs: object;
}
export interface AdminConversationsSetTeamsArguments extends WebAPICallOptions, TokenOverridable {
  channel_id: string;
  team_id?: string;
  target_team_ids?: string[];
  org_channel?: boolean;
}
export interface AdminConversationsUnarchiveArguments extends WebAPICallOptions, TokenOverridable {
  channel_id: string;
}
export interface AdminEmojiAddArguments extends WebAPICallOptions, TokenOverridable {
  name: string;
  url: string;
}
export interface AdminEmojiAddAliasArguments extends WebAPICallOptions, TokenOverridable {
  name: string;
  alias_for: string;
}
export interface AdminEmojiListArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
}
export interface AdminEmojiRemoveArguments extends WebAPICallOptions, TokenOverridable {
  name: string;
}
export interface AdminEmojiRenameArguments extends WebAPICallOptions, TokenOverridable {
  name: string;
  new_name: string;
}
export interface AdminInviteRequestsApproveArguments extends WebAPICallOptions, TokenOverridable {
  invite_request_id: string;
  team_id: string;
}
export interface AdminInviteRequestsApprovedListArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
  team_id: string;
}
export interface AdminInviteRequestsDenyArguments extends WebAPICallOptions, TokenOverridable {
  invite_request_id: string;
  team_id: string;
}
export interface AdminInviteRequestsDeniedListArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
  team_id: string;
}
export interface AdminInviteRequestsListArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
  team_id: string;
}
export interface AdminTeamsAdminsListArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
  team_id: string;
}
export interface AdminTeamsCreateArguments extends WebAPICallOptions, TokenOverridable {
  team_domain: string;
  team_name: string;
  team_description?: string;
  team_discoverability?: string;
}
export interface AdminTeamsListArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
}
export interface AdminTeamsOwnersListArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
  team_id: string;
}
export interface AdminTeamsSettingsInfoArguments extends WebAPICallOptions, TokenOverridable {
  team_id: string;
}
export interface AdminTeamsSettingsSetDefaultChannelsArguments extends WebAPICallOptions, TokenOverridable {
  team_id: string;
  channel_ids: string[];
}
export interface AdminTeamsSettingsSetDescriptionArguments extends WebAPICallOptions, TokenOverridable {
  team_id: string;
  description: string;
}
export interface AdminTeamsSettingsSetDiscoverabilityArguments extends WebAPICallOptions, TokenOverridable {
  team_id: string;
  discoverability: 'open' | 'invite_only' | 'closed' | 'unlisted';
}
export interface AdminTeamsSettingsSetIconArguments extends WebAPICallOptions, TokenOverridable {
  team_id: string;
  image_url: string;
}
export interface AdminTeamsSettingsSetNameArguments extends WebAPICallOptions, TokenOverridable {
  team_id: string;
  name: string;
}
export interface AdminUsergroupsAddChannelsArguments extends WebAPICallOptions, TokenOverridable {
  usergroup_id: string;
  team_id?: string;
  channel_ids: string | string[];
}
export interface AdminUsergroupsAddTeamsArguments extends WebAPICallOptions, TokenOverridable {
  usergroup_id: string;
  team_ids: string | string[];
  auto_provision?: boolean;
}
export interface AdminUsergroupsListChannelsArguments extends WebAPICallOptions, TokenOverridable {
  usergroup_id: string;
  include_num_members?: boolean;
  team_id?: string;
}
export interface AdminUsergroupsRemoveChannelsArguments extends WebAPICallOptions, TokenOverridable {
  usergroup_id: string;
  channel_ids: string | string[];
}
export interface AdminUsersAssignArguments extends WebAPICallOptions, TokenOverridable {
  team_id: string;
  user_id: string;
  is_restricted?: boolean;
  is_ultra_restricted?: boolean;
}
export interface AdminUsersInviteArguments extends WebAPICallOptions, TokenOverridable {
  channel_ids: string;
  email: string;
  team_id: string;
  custom_message?: string;
  email_password_policy_enabled?: boolean;
  guest_expiration_ts?: string;
  is_restricted?: boolean;
  is_ultra_restricted?: boolean;
  real_name?: string;
  resend?: boolean;
}
export interface AdminUsersListArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
  team_id: string;
}
export interface AdminUsersRemoveArguments extends WebAPICallOptions, TokenOverridable {
  team_id: string;
  user_id: string;
}
export interface AdminUsersSetAdminArguments extends WebAPICallOptions, TokenOverridable {
  team_id: string;
  user_id: string;
}
export interface AdminUsersSetExpirationArguments extends WebAPICallOptions, TokenOverridable {
  team_id: string;
  user_id: string;
  expiration_ts: number;
}
export interface AdminUsersSetOwnerArguments extends WebAPICallOptions, TokenOverridable {
  team_id: string;
  user_id: string;
}
export interface AdminUsersSetRegularArguments extends WebAPICallOptions, TokenOverridable {
  team_id: string;
  user_id: string;
}
export interface AdminUsersSessionListArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
  user_id?: string;
  team_id?: string;
}
export interface AdminUsersSessionResetArguments extends WebAPICallOptions, TokenOverridable {
  user_id: string;
  mobile_only?: boolean;
  web_only?: boolean;
}
export interface AdminUsersSessionInvalidateArguments extends WebAPICallOptions, TokenOverridable {
  session_id: string;
  team_id: string;
}
export interface AdminUsersSessionGetSettingsArguments extends WebAPICallOptions, TokenOverridable {
  user_ids: string[];
}
export interface AdminUsersSessionSetSettingsArguments extends WebAPICallOptions, TokenOverridable {
  user_ids: string[];
  desktop_app_browser_quit?: boolean;
  duration?: number;
}
export interface AdminUsersSessionClearSettingsArguments extends WebAPICallOptions, TokenOverridable {
  user_ids: string[];
}
export interface APITestArguments extends WebAPICallOptions {
}
export interface AppsConnectionsOpenArguments extends WebAPICallOptions {
}
export interface AppsEventAuthorizationsListArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
  event_context: string;
}
export interface AppsUninstallArguments extends WebAPICallOptions {
  client_id: string;
  client_secret: string;
}
export interface AuthRevokeArguments extends WebAPICallOptions, TokenOverridable {
  test: boolean;
}
export interface AuthTeamsListArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
  include_icon?: boolean;
}
export interface AuthTestArguments extends WebAPICallOptions, TokenOverridable {
}
export interface BotsInfoArguments extends WebAPICallOptions, TokenOverridable {
  bot?: string;
  team_id?: string;
}
export interface CallsAddArguments extends WebAPICallOptions, TokenOverridable {
  external_unique_id: string;
  join_url: string;
  created_by?: string;
  date_start?: number;
  desktop_app_join_url?: string;
  external_display_id?: string;
  title?: string;
  users?: CallUser[];
}
export interface CallsEndArguments extends WebAPICallOptions, TokenOverridable {
  id: string;
  duration?: number;
}
export interface CallsInfoArguments extends WebAPICallOptions, TokenOverridable {
  id: string;
}
export interface CallsUpdateArguments extends WebAPICallOptions, TokenOverridable {
  id: string;
  join_url?: string;
  desktop_app_join_url?: string;
  title?: string;
}
export interface CallsParticipantsAddArguments extends WebAPICallOptions, TokenOverridable {
  id: string;
  users: CallUser[];
}
export interface CallsParticipantsRemoveArguments extends WebAPICallOptions, TokenOverridable {
  id: string;
  users: CallUser[];
}
export interface ChannelsArchiveArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
}
export interface ChannelsCreateArguments extends WebAPICallOptions, TokenOverridable {
  name: string;
  validate?: boolean;
  team_id?: string;
}
export interface ChannelsHistoryArguments extends WebAPICallOptions, TokenOverridable, TimelinePaginationEnabled {
  channel: string;
  count?: number;
  unreads?: boolean;
}
export interface ChannelsInfoArguments extends WebAPICallOptions, TokenOverridable, LocaleAware {
  channel: string;
}
export interface ChannelsInviteArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  user: string;
}
export interface ChannelsJoinArguments extends WebAPICallOptions, TokenOverridable {
  name: string;
  validate?: boolean;
}
export interface ChannelsKickArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  user: string;
}
export interface ChannelsLeaveArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
}
export interface ChannelsListArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
  exclude_archived?: boolean;
  exclude_members?: boolean;
  team_id?: string;
}
export interface ChannelsMarkArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  ts: string;
}
export interface ChannelsRenameArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  name: string;
  validate?: boolean;
}
export interface ChannelsRepliesArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  thread_ts: string;
}
export interface ChannelsSetPurposeArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  purpose: string;
}
export interface ChannelsSetTopicArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  topic: string;
}
export interface ChannelsUnarchiveArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
}
export interface ChatDeleteArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  ts: string;
  as_user?: boolean;
}
export interface ChatDeleteScheduledMessageArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  scheduled_message_id: string;
  as_user?: boolean;
}
export interface ChatGetPermalinkArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  message_ts: string;
}
export interface ChatMeMessageArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  text: string;
}
export interface ChatPostEphemeralArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  text?: string;
  user: string;
  as_user?: boolean;
  attachments?: MessageAttachment[];
  blocks?: (KnownBlock | Block)[];
  link_names?: boolean;
  parse?: 'full' | 'none';
  thread_ts?: string;
  icon_emoji?: string;
  icon_url?: string;
  username?: string;
}
export interface ChatPostMessageArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  text?: string;
  as_user?: boolean;
  attachments?: MessageAttachment[];
  blocks?: (KnownBlock | Block)[];
  icon_emoji?: string;
  icon_url?: string;
  link_names?: boolean;
  mrkdwn?: boolean;
  parse?: 'full' | 'none';
  reply_broadcast?: boolean;
  thread_ts?: string;
  unfurl_links?: boolean;
  unfurl_media?: boolean;
  username?: string;
}
export interface ChatScheduleMessageArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  text?: string;
  post_at: string | number;
  as_user?: boolean;
  attachments?: MessageAttachment[];
  blocks?: (KnownBlock | Block)[];
  link_names?: boolean;
  parse?: 'full' | 'none';
  reply_broadcast?: boolean;
  thread_ts?: string;
  unfurl_links?: boolean;
  unfurl_media?: boolean;
  team_id?: string;
}
export interface ChatScheduledMessagesListArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
  channel: string;
  latest: number;
  oldest: number;
  team_id?: string;
}
export interface ChatUnfurlArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  ts: string;
  unfurls: LinkUnfurls;
  user_auth_message?: string;
  user_auth_required?: boolean;
  user_auth_url?: string;
  user_auth_blocks?: (KnownBlock | Block)[];
}
export interface ChatUpdateArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  ts: string;
  as_user?: boolean;
  attachments?: MessageAttachment[];
  blocks?: (KnownBlock | Block)[];
  link_names?: boolean;
  parse?: 'full' | 'none';
  text?: string;
}
export interface ConversationsAcceptSharedInviteArguments extends WebAPICallOptions, TokenOverridable {
  channel_name: string;
  channel_id?: string;
  free_trial_accepted?: boolean;
  invite_id?: string;
  is_private?: boolean;
  team_id?: string;
}
export interface ConversationsApproveSharedInviteArguments extends WebAPICallOptions, TokenOverridable {
  invite_id: string;
  target_team?: string;
}
export interface ConversationsArchiveArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
}
export interface ConversationsCloseArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
}
export interface ConversationsCreateArguments extends WebAPICallOptions, TokenOverridable {
  name: string;
  is_private?: boolean;
  team_id?: string;
}
export interface ConversationsDeclineSharedInviteArguments extends WebAPICallOptions, TokenOverridable {
  invite_id: string;
  target_team?: string;
}
export interface ConversationsHistoryArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled, TimelinePaginationEnabled {
  channel: string;
}
export interface ConversationsInfoArguments extends WebAPICallOptions, TokenOverridable, LocaleAware {
  channel: string;
  include_num_members?: boolean;
}
export interface ConversationsInviteArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  users: string;
}
export interface ConversationsInviteSharedArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  emails?: string[];
  user_ids?: string[];
}
export interface ConversationsJoinArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
}
export interface ConversationsKickArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  user: string;
}
export interface ConversationsLeaveArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
}
export interface ConversationsListArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
  exclude_archived?: boolean;
  types?: string;
  team_id?: string;
}
export interface ConversationsListConnectInvitesArguments extends WebAPICallOptions, TokenOverridable {
  count?: number;
  cursor?: string;
  team_id?: string;
}
export interface ConversationsMarkArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  ts: string;
}
export interface ConversationsMembersArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
  channel: string;
}
export interface ConversationsOpenArguments extends WebAPICallOptions, TokenOverridable {
  channel?: string;
  users?: string;
  return_im?: boolean;
}
export interface ConversationsRenameArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  name: string;
}
export interface ConversationsRepliesArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled, TimelinePaginationEnabled {
  channel: string;
  ts: string;
}
export interface ConversationsSetPurposeArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  purpose: string;
}
export interface ConversationsSetTopicArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  topic: string;
}
export interface ConversationsUnarchiveArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
}
export interface DialogOpenArguments extends WebAPICallOptions, TokenOverridable {
  trigger_id: string;
  dialog: Dialog;
}
export interface DndEndDndArguments extends WebAPICallOptions, TokenOverridable {
}
export interface DndEndSnoozeArguments extends WebAPICallOptions, TokenOverridable {
}
export interface DndInfoArguments extends WebAPICallOptions, TokenOverridable {
  user: string;
}
export interface DndSetSnoozeArguments extends WebAPICallOptions, TokenOverridable {
  num_minutes: number;
}
export interface DndTeamInfoArguments extends WebAPICallOptions, TokenOverridable {
  users?: string;
}
export interface EmojiListArguments extends WebAPICallOptions, TokenOverridable {
}
export interface FilesDeleteArguments extends WebAPICallOptions, TokenOverridable {
  file: string;
}
export interface FilesInfoArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
  file: string;
  count?: number;
  page?: number;
}
export interface FilesListArguments extends WebAPICallOptions, TokenOverridable, TraditionalPagingEnabled {
  channel?: string;
  user?: string;
  ts_from?: string;
  ts_to?: string;
  types?: string;
  show_files_hidden_by_limit?: boolean;
  team_id?: string;
}
export interface FilesRevokePublicURLArguments extends WebAPICallOptions, TokenOverridable {
  file: string;
}
export interface FilesSharedPublicURLArguments extends WebAPICallOptions, TokenOverridable {
  file: string;
}
export interface FilesUploadArguments extends WebAPICallOptions, TokenOverridable {
  channels?: string;
  content?: string;
  file?: Buffer | Stream;
  filename?: string;
  filetype?: string;
  initial_comment?: string;
  title?: string;
  thread_ts?: string;
}
export interface FilesCommentsDeleteArguments extends WebAPICallOptions, TokenOverridable {
  file: string;
  id: string;
}
export interface FilesRemoteInfoArguments extends WebAPICallOptions, TokenOverridable {
  file?: string;
  external_id?: string;
}
export interface FilesRemoteListArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
  ts_from?: string;
  ts_to?: string;
  channel?: string;
}
export interface FilesRemoteAddArguments extends WebAPICallOptions, TokenOverridable {
  title: string;
  external_url: string;
  external_id: string;
  filetype: string;
  preview_image?: Buffer | Stream;
  indexable_file_contents?: Buffer | Stream;
}
export interface FilesRemoteUpdateArguments extends WebAPICallOptions, TokenOverridable {
  title?: string;
  external_url?: string;
  filetype?: string;
  preview_image?: Buffer | Stream;
  indexable_file_contents?: Buffer | Stream;
  file?: string;
  external_id?: string;
}
export interface FilesRemoteRemoveArguments extends WebAPICallOptions, TokenOverridable {
  file?: string;
  external_id?: string;
}
export interface FilesRemoteShareArguments extends WebAPICallOptions, TokenOverridable {
  channels: string;
  file?: string;
  external_id?: string;
}
export interface GroupsArchiveArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
}
export interface GroupsCreateArguments extends WebAPICallOptions, TokenOverridable {
  name: string;
  validate?: boolean;
  team_id?: string;
}
export interface GroupsCreateChildArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
}
export interface GroupsHistoryArguments extends WebAPICallOptions, TokenOverridable, TimelinePaginationEnabled {
  channel: string;
  unreads?: boolean;
  count?: number;
}
export interface GroupsInfoArguments extends WebAPICallOptions, TokenOverridable, LocaleAware {
  channel: string;
}
export interface GroupsInviteArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  user: string;
}
export interface GroupsKickArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  user: string;
}
export interface GroupsLeaveArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
}
export interface GroupsListArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
  exclude_archived?: boolean;
  exclude_members?: boolean;
  team_id?: string;
}
export interface GroupsMarkArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  ts: string;
}
export interface GroupsOpenArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
}
export interface GroupsRenameArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  name: string;
  validate?: boolean;
}
export interface GroupsRepliesArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  thread_ts: boolean;
}
export interface GroupsSetPurposeArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  purpose: string;
}
export interface GroupsSetTopicArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  topic: string;
}
export interface GroupsUnarchiveArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
}
export interface IMCloseArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
}
export interface IMHistoryArguments extends WebAPICallOptions, TokenOverridable, TimelinePaginationEnabled {
  channel: string;
  count?: number;
  unreads?: boolean;
}
export interface IMListArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
}
export interface IMMarkArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  ts: string;
}
export interface IMOpenArguments extends WebAPICallOptions, TokenOverridable, LocaleAware {
  user: string;
  return_im?: boolean;
}
export interface IMRepliesArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  thread_ts?: string;
}
export interface MigrationExchangeArguments extends WebAPICallOptions, TokenOverridable {
  users: string;
  to_old?: boolean;
  team_id?: string;
}
export interface MPIMCloseArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
}
export interface MPIMHistoryArguments extends WebAPICallOptions, TokenOverridable, TimelinePaginationEnabled {
  channel: string;
  count?: number;
  unreads?: boolean;
}
export interface MPIMListArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
}
export interface MPIMMarkArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  ts: string;
}
export interface MPIMOpenArguments extends WebAPICallOptions, TokenOverridable {
  users: string;
}
export interface MPIMRepliesArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  thread_ts: string;
}
export interface OAuthAccessArguments extends WebAPICallOptions {
  client_id: string;
  client_secret: string;
  code: string;
  redirect_uri?: string;
  single_channel?: string;
}
export interface OAuthV2AccessArguments extends WebAPICallOptions {
  client_id: string;
  client_secret: string;
  code?: string;
  redirect_uri?: string;
  grant_type?: string;
  refresh_token?: string;
}
export interface OAuthV2ExchangeArguments extends WebAPICallOptions {
  client_id: string;
  client_secret: string;
  grant_type: string;
  refresh_token: string;
}
export interface OpenIDConnectTokenArguments extends WebAPICallOptions {
  client_id: string;
  client_secret: string;
  code?: string;
  redirect_uri?: string;
  grant_type?: 'authorization_code' | 'refresh_token';
  refresh_token?: string;
}
export interface OpenIDConnectUserInfoArguments extends WebAPICallOptions {
}
export interface PinsAddArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  timestamp: string;
}
export interface PinsListArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
}
export interface PinsRemoveArguments extends WebAPICallOptions, TokenOverridable {
  channel: string;
  timestamp: string;
}
export interface ReactionsAddArguments extends WebAPICallOptions, TokenOverridable {
  name: string;
  channel?: string;
  timestamp?: string;
  file?: string;
  file_comment?: string;
}
export interface ReactionsGetArguments extends WebAPICallOptions, TokenOverridable {
  full?: boolean;
  channel?: string;
  timestamp?: string;
  file?: string;
  file_comment?: string;
}
export interface ReactionsListArguments extends WebAPICallOptions, TokenOverridable, TraditionalPagingEnabled, CursorPaginationEnabled {
  user?: string;
  full?: boolean;
  team_id?: string;
}
export interface ReactionsRemoveArguments extends WebAPICallOptions, TokenOverridable {
  name: string;
  channel?: string;
  timestamp?: string;
  file?: string;
  file_comment?: string;
}
export interface RemindersAddArguments extends WebAPICallOptions, TokenOverridable {
  text: string;
  time: string | number;
  user?: string;
}
export interface RemindersCompleteArguments extends WebAPICallOptions, TokenOverridable {
  reminder: string;
}
export interface RemindersDeleteArguments extends WebAPICallOptions, TokenOverridable {
  reminder: string;
}
export interface RemindersInfoArguments extends WebAPICallOptions, TokenOverridable {
  reminder: string;
}
export interface RemindersListArguments extends WebAPICallOptions, TokenOverridable {
}
export interface RTMConnectArguments extends WebAPICallOptions, TokenOverridable {
  batch_presence_aware?: boolean;
  presence_sub?: boolean;
}
export interface RTMStartArguments extends WebAPICallOptions, TokenOverridable, LocaleAware {
  batch_presence_aware?: boolean;
  mpim_aware?: boolean;
  no_latest?: '0' | '1';
  no_unreads?: string;
  presence_sub?: boolean;
  simple_latest?: boolean;
}
export interface SearchAllArguments extends WebAPICallOptions, TokenOverridable, TraditionalPagingEnabled, Searchable {
}
export interface SearchFilesArguments extends WebAPICallOptions, TokenOverridable, TraditionalPagingEnabled, Searchable {
}
export interface SearchMessagesArguments extends WebAPICallOptions, TokenOverridable, TraditionalPagingEnabled, Searchable {
}
export interface StarsAddArguments extends WebAPICallOptions, TokenOverridable {
  channel?: string;
  timestamp?: string;
  file?: string;
  file_comment?: string;
}
export interface StarsListArguments extends WebAPICallOptions, TokenOverridable, TraditionalPagingEnabled, CursorPaginationEnabled {
}
export interface StarsRemoveArguments extends WebAPICallOptions, TokenOverridable {
  channel?: string;
  timestamp?: string;
  file?: string;
  file_comment?: string;
}
export interface TeamAccessLogsArguments extends WebAPICallOptions, TokenOverridable {
  before?: number;
  count?: number;
  page?: number;
  team_id?: string;
}
export interface TeamBillableInfoArguments extends WebAPICallOptions, TokenOverridable {
  user?: string;
  team_id?: string;
}
export interface TeamInfoArguments extends WebAPICallOptions, TokenOverridable {
  team?: string;
}
export interface TeamIntegrationLogsArguments extends WebAPICallOptions, TokenOverridable {
  app_id?: string;
  change_type?: string;
  count?: number;
  page?: number;
  service_id?: string;
  user?: string;
  team_id?: string;
}
export interface TeamProfileGetArguments extends WebAPICallOptions, TokenOverridable {
  visibility?: 'all' | 'visible' | 'hidden';
  team_id?: string;
}
export interface UsergroupsCreateArguments extends WebAPICallOptions, TokenOverridable {
  name: string;
  channels?: string;
  description?: string;
  handle?: string;
  include_count?: boolean;
}
export interface UsergroupsDisableArguments extends WebAPICallOptions, TokenOverridable {
  usergroup: string;
  include_count?: boolean;
}
export interface UsergroupsEnableArguments extends WebAPICallOptions, TokenOverridable {
  usergroup: string;
  include_count?: boolean;
}
export interface UsergroupsListArguments extends WebAPICallOptions, TokenOverridable {
  include_count?: boolean;
  include_disabled?: boolean;
  include_users?: boolean;
}
export interface UsergroupsUpdateArguments extends WebAPICallOptions, TokenOverridable {
  usergroup: string;
  channels?: string;
  description?: string;
  handle?: string;
  include_count?: boolean;
  name?: string;
}
export interface UsergroupsUsersListArguments extends WebAPICallOptions, TokenOverridable {
  usergroup: string;
  include_disabled?: boolean;
}
export interface UsergroupsUsersUpdateArguments extends WebAPICallOptions, TokenOverridable {
  usergroup: string;
  users: string;
  include_count?: boolean;
}
export interface UsersConversationsArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled {
  exclude_archived?: boolean;
  types?: string;
  user?: string;
  team_id?: string;
}
export interface UsersDeletePhotoArguments extends WebAPICallOptions, TokenOverridable {
}
export interface UsersGetPresenceArguments extends WebAPICallOptions, TokenOverridable {
  user: string;
}
export interface UsersIdentityArguments extends WebAPICallOptions, TokenOverridable {
}
export interface UsersInfoArguments extends WebAPICallOptions, TokenOverridable, LocaleAware {
  user: string;
}
export interface UsersListArguments extends WebAPICallOptions, TokenOverridable, CursorPaginationEnabled, LocaleAware {
  presence?: boolean;
  team_id?: string;
}
export interface UsersLookupByEmailArguments extends WebAPICallOptions, TokenOverridable {
  email: string;
}
export interface UsersSetPhotoArguments extends WebAPICallOptions, TokenOverridable {
  image: Buffer | Stream;
  crop_w?: number;
  crop_x?: number;
  crop_y?: number;
}
export interface UsersSetPresenceArguments extends WebAPICallOptions, TokenOverridable {
  presence: 'auto' | 'away';
}
export interface UsersProfileGetArguments extends WebAPICallOptions, TokenOverridable {
  include_labels?: boolean;
  user?: string;
}
export interface UsersProfileSetArguments extends WebAPICallOptions, TokenOverridable {
  profile?: string;
  user?: string;
  name?: string;
  value?: string;
}
export interface ViewsOpenArguments extends WebAPICallOptions, TokenOverridable {
  trigger_id: string;
  view: View;
}
export interface ViewsPushArguments extends WebAPICallOptions, TokenOverridable {
  trigger_id: string;
  view: View;
}
export interface ViewsPublishArguments extends WebAPICallOptions, TokenOverridable {
  user_id: string;
  view: View;
  hash?: string;
}
export interface ViewsUpdateArguments extends WebAPICallOptions, TokenOverridable {
  view_id?: string;
  view: View;
  external_id?: string;
  hash?: string;
}
export interface WorkflowsStepCompletedArguments extends WebAPICallOptions, TokenOverridable {
  workflow_step_execute_id: string;
  outputs?: object;
}
export interface WorkflowsStepFailedArguments extends WebAPICallOptions, TokenOverridable {
  workflow_step_execute_id: string;
  error: {
      message: string;
  };
}
export interface WorkflowsUpdateStepArguments extends WebAPICallOptions, TokenOverridable {
  workflow_step_edit_id: string;
  step_image_url?: string;
  step_name?: string;
  inputs?: {
      [name: string]: {
          value: any;
          skip_variable_replacement?: boolean;
          variables?: {
              [key: string]: any;
          };
      };
  };
  outputs?: {
      type: string;
      name: string;
      label: string;
  }[];
}

/**
* A client for Slack's Web API
*
* This client provides an alias for each {@link https://api.slack.com/methods|Web API method}. Each method is
* a convenience wrapper for calling the {@link WebClient#apiCall} method using the method name as the first parameter.
*/
export declare class WebClient extends Methods {
  /**
   * The base URL for reaching Slack's Web API. Consider changing this value for testing purposes.
   */
  readonly slackApiUrl: string;
  /**
   * Authentication and authorization token for accessing Slack Web API (usually begins with `xoxp` or `xoxb`)
   */
  readonly token?: string;
  /**
   * Configuration for retry operations. See {@link https://github.com/tim-kos/node-retry|node-retry} for more details.
   */
  private retryConfig;
  /**
   * Queue of requests in which a maximum of {@link WebClientOptions.maxRequestConcurrency} can concurrently be
   * in-flight.
   */
  private requestQueue;
  /**
   * Axios HTTP client instance used by this client
   */
  private axios;
  /**
   * Configuration for custom TLS handling
   */
  private tlsConfig;
  /**
   * Preference for immediately rejecting API calls which result in a rate-limited response
   */
  private rejectRateLimitedCalls;
  /**
   * The name used to prefix all logging generated from this object
   */
  private static loggerName;
  /**
   * This object's logger instance
   */
  private logger;
  /**
   * This object's teamId value
   */
  private teamId?;
  /**
   * @param token - An API token to authenticate/authorize with Slack (usually start with `xoxp`, `xoxb`)
   */
  constructor(token?: string, { slackApiUrl, logger, logLevel, maxRequestConcurrency, retryConfig, agent, tls, timeout, rejectRateLimitedCalls, headers, teamId, }?: WebClientOptions);
  /**
   * Generic method for calling a Web API method
   *
   * @param method - the Web API method to call {@link https://api.slack.com/methods}
   * @param options - options
   */
  apiCall(method: string, options?: WebAPICallOptions): Promise<WebAPICallResult>;
  /**
   * Iterate over the result pages of a cursor-paginated Web API method. This method can return two types of values,
   * depending on which arguments are used. When up to two parameters are used, the return value is an async iterator
   * which can be used as the iterable in a for-await-of loop. When three or four parameters are used, the return
   * value is a promise that resolves at the end of iteration. The third parameter, `shouldStop`, is a function that is
   * called with each `page` and can end iteration by returning `true`. The fourth parameter, `reduce`, is a function
   * that is called with three arguments: `accumulator`, `page`, and `index`. The `accumulator` is a value of any type
   * you choose, but it will contain `undefined` when `reduce` is called for the first time. The `page` argument and
   * `index` arguments are exactly what they say they are. The `reduce` function's return value will be passed in as
   * `accumulator` the next time its called, and the returned promise will resolve to the last value of `accumulator`.
   *
   * The for-await-of syntax is part of ES2018. It is available natively in Node starting with v10.0.0. You may be able
   * to use it in earlier JavaScript runtimes by transpiling your source with a tool like Babel. However, the
   * transpiled code will likely sacrifice performance.
   *
   * @param method - the cursor-paginated Web API method to call {@link https://api.slack.com/docs/pagination}
   * @param options - options
   * @param shouldStop - a predicate that is called with each page, and should return true when pagination can end.
   * @param reduce - a callback that can be used to accumulate a value that the return promise is resolved to
   */
  paginate(method: string, options?: WebAPICallOptions): AsyncIterable<WebAPICallResult>;
  paginate(method: string, options: WebAPICallOptions, shouldStop: PaginatePredicate): Promise<void>;
  paginate<R extends PageReducer, A extends PageAccumulator<R>>(method: string, options: WebAPICallOptions, shouldStop: PaginatePredicate, reduce?: PageReducer<A>): Promise<A>;
  /**
   * Low-level function to make a single API request. handles queuing, retries, and http-level errors
   */
  private makeRequest;
  /**
   * Transforms options (a simple key-value object) into an acceptable value for a body. This can be either
   * a string, used when posting with a content-type of url-encoded. Or, it can be a readable stream, used
   * when the options contain a binary (a stream or a buffer) and the upload should be done with content-type
   * multipart/form-data.
   *
   * @param options - arguments for the Web API method
   * @param headers - a mutable object representing the HTTP headers for the outgoing request
   */
  private serializeApiCallOptions;
  /**
   * Processes an HTTP response into a WebAPICallResult by performing JSON parsing on the body and merging relevant
   * HTTP headers into the object.
   * @param response - an http response
   */
  private buildResult;
}
export default WebClient;
export interface WebClientOptions {
  slackApiUrl?: string;
  logger?: Logger;
  logLevel?: LogLevel;
  maxRequestConcurrency?: number;
  retryConfig?: RetryOptions;
  agent?: Agent;
  tls?: TLSOptions;
  timeout?: number;
  rejectRateLimitedCalls?: boolean;
  headers?: object;
  teamId?: string;
}
export declare type TLSOptions = Pick<SecureContextOptions, 'pfx' | 'key' | 'passphrase' | 'cert' | 'ca'>;
export declare enum WebClientEvent {
  RATE_LIMITED = "rate_limited"
}
export interface WebAPICallOptions {
  [argument: string]: unknown;
}
export interface WebAPICallResult {
  ok: boolean;
  error?: string;
  response_metadata?: {
      warnings?: string[];
      next_cursor?: string;
      scopes?: string[];
      acceptedScopes?: string[];
      retryAfter?: number;
      messages?: string[];
  };
  [key: string]: unknown;
}
export interface PaginatePredicate {
  (page: WebAPICallResult): boolean | undefined | void;
}
export interface PageReducer<A = any> {
  (accumulator: A | undefined, page: WebAPICallResult, index: number): A;
}
export declare type PageAccumulator<R extends PageReducer> = R extends (accumulator: (infer A) | undefined, page: WebAPICallResult, index: number) => infer A ? A : never;


declare module '@fusebit-int/framework' {

  export declare class Tenant {
    <%# connectors %>

     /**
     * Get HubSpot Client SDK for <% name %>
     * @param ctx The context object provided by the route function
     * @param {string} connectorName
     * @param {string} tenantId
     * @returns Promise<HubSpotClient>
     */
    getSdkByTenant(ctx: any, connectorName: '<% name %>', tenantId: string): Promise<HubSpotClient>;

   <%/ connectors %>
  }

  export declare class Middleware {
    /** Authorize user middleware
    * (Read more at https://developer.fusebit.io/docs/integration-programming-model#protecting-your-api)
    * @param {string} action The name of the action to authorize (i.e instance:get)
    */
     authorizeUser:(action:string) => (ctx: any, next: import("koa").Next) => Promise<undefined>;
 }

  export declare class Service {
    <%# connectors %>
    
        /**
        * Get HubSpot Client SDK for <% name %>
        * @param ctx The context object provided by the route function
        * @param {string} connectorName
        * @param {string} instanceId
        * @returns Promise<HubSpotClient>
        */
        getSdk: (ctx: any, connectorName: '<% name %>', instanceId: string) => Promise<HubSpotClient>;
        
    <%/ connectors %>

    /** Get an instantiated SDK for each specified connector
     * @param ctx The context object provided by the route function
     * @param {string[]} connectorNames
    */
    getSdks: (ctx: any, connectorNames: string[], instanceId: string) => Promise<any>[];
    
    /** Get a specific instance
     * @param ctx The context object provided by the route function
     * @param {string} instanceId
    */
    getInstance: (ctx: any, instanceId: string) => Promise<any>;
}

export interface IListOption {
  count?: number;
  next?: string;
}

export interface IStorageVersionedResponse {
    storageId: string;
    data?: any;
    version?: string;
    tags?: Record<string, string>;
    status: number;
}

export interface IStorageVersionedResponseList {
    items: Omit<IStorageVersionedResponse, 'status'>[];
    total: number;
    status: number;
    next: string;
}

export interface IStorageVersionedResponseDelete {
    status: number;
  }

abstract class StorageBase {
  /** Save any data in JSON format up to ~400Kb in size.
   * @example
   * ```
   * router.post('/api/tenant/:tenantId/colors', async (ctx) => {
   *    // By convention we use / symbol to represent a bucket, but you can use any name you want.
   *    const bucketName = '/my-bucket/';
   *    const key = 'colors';
   *    const data = ['green', 'blue'];
   *    const result = await integration.storage.setData(ctx, `${bucketName}${key}`, data);
   *    ctx.body = result;
   * });
   * ```
   * @param ctx The context object provided by the route function
   * @param {string} dataKey represents a reference to your data that you will use in further operations like read, delete and update
   * @param {string} data Any valid JSON
  */
  setData: (ctx: any, dataKey: string, data: any) => Promise<IStorageVersionedResponse>;
  /** Get saved data
   * @param ctx The context object provided by the route function
   * @param {string} dataKey the key name used for referencing the stored data
  */
  getData: (ctx: any, dataKey: string) => Promise<IStorageVersionedResponse>;

  /** A listing operation query data stored in an artifact known as a Bucket
   * (Buckets are collections of keys where you can store related data).
   * Read more at https://developer.fusebit.io/docs/integration-programming-model#listing-data
   * @example
   * ```
   * router.get('/api/tenant/:tenantId/my-bucket', async (ctx) => {
   *        const bucketName = '/my-bucket/';
   *        const result = await integration.storage.listData(ctx, bucketName);
   *        ctx.body = result;
   * });
   * ```
   * @param ctx The context object provided by the route function
   * @param {string} dataKeyPrefix The bucket name 
  */
  listData: (ctx: any, dataKeyPrefix: string, options?: IListOption) => Promise<IStorageVersionedResponseList>;
  /** Delete data
   * @param ctx The context object provided by the route function
   * @param {string} dataKey reference the key name used for storing the data
   * @param {string=} version Delete a specific version of the stored data
  */
  deleteData: (ctx: any, dataKey: string, version?: string) => Promise<IStorageVersionedResponseDelete>;
  /** Delete data stored in an artifact known as a Bucket
   * (This function will remove a collection of keys stored under the specified Bucket).
   * @param ctx The context object provided by the route function
   * @param {string} dataKeyPrefix The bucket name 
   * @param {string=} version Delete a specific version of the Bucket
  */
  deletePrefixedData: (ctx: any, dataKeyPrefix: string, version?: string) => Promise<IStorageVersionedResponseDelete>;

    /** Delete data stored in an artifact known as a Bucket
   * (This function will remove a collection of keys stored under the specified Bucket).
   * @param ctx The context object provided by the route function
   * @param {boolean} forceDelete
  */
  deleteAllData: (ctx: any, forceDelete: boolean) => Promise<IStorageVersionedResponseDelete>;
}

  export declare class Integration {
    tenant: Tenant;
    service: Service;
    middleware: Middleware;
    storage: StorageBase;
  }
}
