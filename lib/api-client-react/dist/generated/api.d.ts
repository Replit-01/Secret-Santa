import type { DataTag, DefinedInitialDataOptions, DefinedUseQueryResult, QueryClient, QueryKey, UndefinedInitialDataOptions, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { AdminRoomsResponse, Assignment, AuthResponse, ErrorResponse, HealthStatus, LoginInput, OkResponse, ProfileResponse, RegisterInput, RoomDetail, RoomInput, RoomSummary, Wishlist, WishlistInput } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getGetHealthUrl: () => string;
/**
 * @summary Check API health
 */
export declare const getHealth: (options?: Parameters<typeof customFetch>[1]) => Promise<HealthStatus>;
export declare const getGetHealthQueryKey: () => readonly ["/api/healthz"];
export declare const getGetHealthQueryOptions: <TData = Awaited<ReturnType<typeof getHealth>>, TError = ErrorType<unknown>>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getHealth>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getHealth>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type GetHealthQueryResult = NonNullable<Awaited<ReturnType<typeof getHealth>>>;
export type GetHealthQueryError = ErrorType<unknown>;
/** @summary Check API health */
export declare function useGetHealth<TData = Awaited<ReturnType<typeof getHealth>>, TError = ErrorType<unknown>>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof getHealth>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof getHealth>>, TError, Awaited<ReturnType<typeof getHealth>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/** @summary Check API health */
export declare function useGetHealth<TData = Awaited<ReturnType<typeof getHealth>>, TError = ErrorType<unknown>>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getHealth>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof getHealth>>, TError, Awaited<ReturnType<typeof getHealth>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/** @summary Check API health */
export declare function useGetHealth<TData = Awaited<ReturnType<typeof getHealth>>, TError = ErrorType<unknown>>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getHealth>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare const getRegisterUserUrl: () => string;
/**
 * @summary Register a participant account
 */
export declare const registerUser: (registerInput: RegisterInput, options?: Parameters<typeof customFetch>[1]) => Promise<AuthResponse>;
export declare const getRegisterUserMutationKey: () => readonly ["registerUser"];
export declare const getRegisterUserMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof registerUser>>, TError, RegisterUserMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof registerUser>>, TError, RegisterUserMutationVariables, TContext>;
export type RegisterUserMutationResult = NonNullable<Awaited<ReturnType<typeof registerUser>>>;
export type RegisterUserMutationBody = BodyType<RegisterInput>;
export type RegisterUserMutationError = ErrorType<ErrorResponse>;
export type RegisterUserMutationVariables = {
    data: BodyType<RegisterInput>;
};
/** @summary Register a participant account */
export declare const useRegisterUser: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof registerUser>>, TError, RegisterUserMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof registerUser>>, TError, RegisterUserMutationVariables, TContext>;
export declare const getLoginUserUrl: () => string;
/**
 * @summary Sign in to an existing account
 */
export declare const loginUser: (loginInput: LoginInput, options?: Parameters<typeof customFetch>[1]) => Promise<AuthResponse>;
export declare const getLoginUserMutationKey: () => readonly ["loginUser"];
export declare const getLoginUserMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof loginUser>>, TError, LoginUserMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof loginUser>>, TError, LoginUserMutationVariables, TContext>;
export type LoginUserMutationResult = NonNullable<Awaited<ReturnType<typeof loginUser>>>;
export type LoginUserMutationBody = BodyType<LoginInput>;
export type LoginUserMutationError = ErrorType<ErrorResponse>;
export type LoginUserMutationVariables = {
    data: BodyType<LoginInput>;
};
/** @summary Sign in to an existing account */
export declare const useLoginUser: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof loginUser>>, TError, LoginUserMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof loginUser>>, TError, LoginUserMutationVariables, TContext>;
export declare const getLogoutUserUrl: () => string;
/**
 * @summary End the current session
 */
export declare const logoutUser: (options?: Parameters<typeof customFetch>[1]) => Promise<OkResponse>;
export declare const getLogoutUserMutationKey: () => readonly ["logoutUser"];
export declare const getLogoutUserMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logoutUser>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof logoutUser>>, TError, void, TContext>;
export type LogoutUserMutationResult = NonNullable<Awaited<ReturnType<typeof logoutUser>>>;
export type LogoutUserMutationError = ErrorType<unknown>;
/** @summary End the current session */
export declare const useLogoutUser: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logoutUser>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof logoutUser>>, TError, void, TContext>;
export declare const getGetCurrentUserUrl: () => string;
/**
 * @summary Get the signed-in user
 */
export declare const getCurrentUser: (options?: Parameters<typeof customFetch>[1]) => Promise<AuthResponse>;
export declare const getGetCurrentUserQueryKey: () => readonly ["/api/auth/me"];
export declare const getGetCurrentUserQueryOptions: <TData = Awaited<ReturnType<typeof getCurrentUser>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type GetCurrentUserQueryResult = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
export type GetCurrentUserQueryError = ErrorType<ErrorResponse>;
/** @summary Get the signed-in user */
export declare function useGetCurrentUser<TData = Awaited<ReturnType<typeof getCurrentUser>>, TError = ErrorType<ErrorResponse>>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, Awaited<ReturnType<typeof getCurrentUser>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/** @summary Get the signed-in user */
export declare function useGetCurrentUser<TData = Awaited<ReturnType<typeof getCurrentUser>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, Awaited<ReturnType<typeof getCurrentUser>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/** @summary Get the signed-in user */
export declare function useGetCurrentUser<TData = Awaited<ReturnType<typeof getCurrentUser>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare const getGetProfileUrl: () => string;
/**
 * @summary Get the user's profile and joined exchanges
 */
export declare const getProfile: (options?: Parameters<typeof customFetch>[1]) => Promise<ProfileResponse>;
export declare const getGetProfileQueryKey: () => readonly ["/api/profile"];
export declare const getGetProfileQueryOptions: <TData = Awaited<ReturnType<typeof getProfile>>, TError = ErrorType<unknown>>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getProfile>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getProfile>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type GetProfileQueryResult = NonNullable<Awaited<ReturnType<typeof getProfile>>>;
export type GetProfileQueryError = ErrorType<unknown>;
/** @summary Get the user's profile and joined exchanges */
export declare function useGetProfile<TData = Awaited<ReturnType<typeof getProfile>>, TError = ErrorType<unknown>>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof getProfile>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof getProfile>>, TError, Awaited<ReturnType<typeof getProfile>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/** @summary Get the user's profile and joined exchanges */
export declare function useGetProfile<TData = Awaited<ReturnType<typeof getProfile>>, TError = ErrorType<unknown>>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getProfile>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof getProfile>>, TError, Awaited<ReturnType<typeof getProfile>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/** @summary Get the user's profile and joined exchanges */
export declare function useGetProfile<TData = Awaited<ReturnType<typeof getProfile>>, TError = ErrorType<unknown>>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getProfile>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare const getListAdminRoomsUrl: () => string;
/**
 * @summary List exchange rooms for the administrator
 */
export declare const listAdminRooms: (options?: Parameters<typeof customFetch>[1]) => Promise<AdminRoomsResponse>;
export declare const getListAdminRoomsQueryKey: () => readonly ["/api/admin/rooms"];
export declare const getListAdminRoomsQueryOptions: <TData = Awaited<ReturnType<typeof listAdminRooms>>, TError = ErrorType<unknown>>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof listAdminRooms>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listAdminRooms>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type ListAdminRoomsQueryResult = NonNullable<Awaited<ReturnType<typeof listAdminRooms>>>;
export type ListAdminRoomsQueryError = ErrorType<unknown>;
/** @summary List exchange rooms for the administrator */
export declare function useListAdminRooms<TData = Awaited<ReturnType<typeof listAdminRooms>>, TError = ErrorType<unknown>>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof listAdminRooms>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof listAdminRooms>>, TError, Awaited<ReturnType<typeof listAdminRooms>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/** @summary List exchange rooms for the administrator */
export declare function useListAdminRooms<TData = Awaited<ReturnType<typeof listAdminRooms>>, TError = ErrorType<unknown>>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof listAdminRooms>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof listAdminRooms>>, TError, Awaited<ReturnType<typeof listAdminRooms>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/** @summary List exchange rooms for the administrator */
export declare function useListAdminRooms<TData = Awaited<ReturnType<typeof listAdminRooms>>, TError = ErrorType<unknown>>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof listAdminRooms>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare const getCreateRoomUrl: () => string;
/**
 * @summary Create an exchange and its join code
 */
export declare const createRoom: (roomInput: RoomInput, options?: Parameters<typeof customFetch>[1]) => Promise<RoomSummary>;
export declare const getCreateRoomMutationKey: () => readonly ["createRoom"];
export declare const getCreateRoomMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createRoom>>, TError, CreateRoomMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createRoom>>, TError, CreateRoomMutationVariables, TContext>;
export type CreateRoomMutationResult = NonNullable<Awaited<ReturnType<typeof createRoom>>>;
export type CreateRoomMutationBody = BodyType<RoomInput>;
export type CreateRoomMutationError = ErrorType<unknown>;
export type CreateRoomMutationVariables = {
    data: BodyType<RoomInput>;
};
/** @summary Create an exchange and its join code */
export declare const useCreateRoom: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createRoom>>, TError, CreateRoomMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof createRoom>>, TError, CreateRoomMutationVariables, TContext>;
export declare const getGetRoomUrl: (roomCode: string) => string;
/**
 * @summary Get a room and its participant list
 */
export declare const getRoom: (roomCode: string, options?: Parameters<typeof customFetch>[1]) => Promise<RoomDetail>;
export declare const getGetRoomQueryKey: (roomCode: string) => readonly [`/api/rooms/${string}`];
export declare const getGetRoomQueryOptions: <TData = Awaited<ReturnType<typeof getRoom>>, TError = ErrorType<ErrorResponse>>(roomCode: string, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getRoom>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRoom>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type GetRoomQueryResult = NonNullable<Awaited<ReturnType<typeof getRoom>>>;
export type GetRoomQueryError = ErrorType<ErrorResponse>;
/** @summary Get a room and its participant list */
export declare function useGetRoom<TData = Awaited<ReturnType<typeof getRoom>>, TError = ErrorType<ErrorResponse>>(roomCode: string, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof getRoom>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof getRoom>>, TError, Awaited<ReturnType<typeof getRoom>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/** @summary Get a room and its participant list */
export declare function useGetRoom<TData = Awaited<ReturnType<typeof getRoom>>, TError = ErrorType<ErrorResponse>>(roomCode: string, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getRoom>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof getRoom>>, TError, Awaited<ReturnType<typeof getRoom>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/** @summary Get a room and its participant list */
export declare function useGetRoom<TData = Awaited<ReturnType<typeof getRoom>>, TError = ErrorType<ErrorResponse>>(roomCode: string, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getRoom>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare const getJoinRoomUrl: (roomCode: string) => string;
/**
 * @summary Join an exchange using its code
 */
export declare const joinRoom: (roomCode: string, options?: Parameters<typeof customFetch>[1]) => Promise<RoomDetail>;
export declare const getJoinRoomMutationKey: () => readonly ["joinRoom"];
export declare const getJoinRoomMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof joinRoom>>, TError, JoinRoomMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof joinRoom>>, TError, JoinRoomMutationVariables, TContext>;
export type JoinRoomMutationResult = NonNullable<Awaited<ReturnType<typeof joinRoom>>>;
export type JoinRoomMutationError = ErrorType<ErrorResponse>;
export type JoinRoomMutationVariables = {
    roomCode: string;
};
/** @summary Join an exchange using its code */
export declare const useJoinRoom: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof joinRoom>>, TError, JoinRoomMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof joinRoom>>, TError, JoinRoomMutationVariables, TContext>;
export declare const getUpdateWishlistUrl: (roomCode: string) => string;
/**
 * @summary Save the current user's gift wishlist
 */
export declare const updateWishlist: (roomCode: string, wishlistInput: WishlistInput, options?: Parameters<typeof customFetch>[1]) => Promise<Wishlist>;
export declare const getUpdateWishlistMutationKey: () => readonly ["updateWishlist"];
export declare const getUpdateWishlistMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateWishlist>>, TError, UpdateWishlistMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateWishlist>>, TError, UpdateWishlistMutationVariables, TContext>;
export type UpdateWishlistMutationResult = NonNullable<Awaited<ReturnType<typeof updateWishlist>>>;
export type UpdateWishlistMutationBody = BodyType<WishlistInput>;
export type UpdateWishlistMutationError = ErrorType<unknown>;
export type UpdateWishlistMutationVariables = {
    roomCode: string;
    data: BodyType<WishlistInput>;
};
/** @summary Save the current user's gift wishlist */
export declare const useUpdateWishlist: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateWishlist>>, TError, UpdateWishlistMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof updateWishlist>>, TError, UpdateWishlistMutationVariables, TContext>;
export declare const getDrawRoomUrl: (roomCode: string) => string;
/**
 * @summary Randomly assign one recipient to each participant
 */
export declare const drawRoom: (roomCode: string, options?: Parameters<typeof customFetch>[1]) => Promise<RoomSummary>;
export declare const getDrawRoomMutationKey: () => readonly ["drawRoom"];
export declare const getDrawRoomMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof drawRoom>>, TError, DrawRoomMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof drawRoom>>, TError, DrawRoomMutationVariables, TContext>;
export type DrawRoomMutationResult = NonNullable<Awaited<ReturnType<typeof drawRoom>>>;
export type DrawRoomMutationError = ErrorType<ErrorResponse>;
export type DrawRoomMutationVariables = {
    roomCode: string;
};
/** @summary Randomly assign one recipient to each participant */
export declare const useDrawRoom: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof drawRoom>>, TError, DrawRoomMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof drawRoom>>, TError, DrawRoomMutationVariables, TContext>;
export declare const getResetRoomDrawUrl: (roomCode: string) => string;
/**
 * @summary Clear assignments and reopen the room
 */
export declare const resetRoomDraw: (roomCode: string, options?: Parameters<typeof customFetch>[1]) => Promise<RoomSummary>;
export declare const getResetRoomDrawMutationKey: () => readonly ["resetRoomDraw"];
export declare const getResetRoomDrawMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof resetRoomDraw>>, TError, ResetRoomDrawMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof resetRoomDraw>>, TError, ResetRoomDrawMutationVariables, TContext>;
export type ResetRoomDrawMutationResult = NonNullable<Awaited<ReturnType<typeof resetRoomDraw>>>;
export type ResetRoomDrawMutationError = ErrorType<unknown>;
export type ResetRoomDrawMutationVariables = {
    roomCode: string;
};
/** @summary Clear assignments and reopen the room */
export declare const useResetRoomDraw: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof resetRoomDraw>>, TError, ResetRoomDrawMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof resetRoomDraw>>, TError, ResetRoomDrawMutationVariables, TContext>;
export declare const getGetMyAssignmentUrl: (roomCode: string) => string;
/**
 * @summary Get only the current user's assigned recipient and wishlist
 */
export declare const getMyAssignment: (roomCode: string, options?: Parameters<typeof customFetch>[1]) => Promise<Assignment>;
export declare const getGetMyAssignmentQueryKey: (roomCode: string) => readonly [`/api/rooms/${string}/assignment`];
export declare const getGetMyAssignmentQueryOptions: <TData = Awaited<ReturnType<typeof getMyAssignment>>, TError = ErrorType<ErrorResponse>>(roomCode: string, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getMyAssignment>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMyAssignment>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type GetMyAssignmentQueryResult = NonNullable<Awaited<ReturnType<typeof getMyAssignment>>>;
export type GetMyAssignmentQueryError = ErrorType<ErrorResponse>;
/** @summary Get only the current user's assigned recipient and wishlist */
export declare function useGetMyAssignment<TData = Awaited<ReturnType<typeof getMyAssignment>>, TError = ErrorType<ErrorResponse>>(roomCode: string, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof getMyAssignment>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof getMyAssignment>>, TError, Awaited<ReturnType<typeof getMyAssignment>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/** @summary Get only the current user's assigned recipient and wishlist */
export declare function useGetMyAssignment<TData = Awaited<ReturnType<typeof getMyAssignment>>, TError = ErrorType<ErrorResponse>>(roomCode: string, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getMyAssignment>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof getMyAssignment>>, TError, Awaited<ReturnType<typeof getMyAssignment>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/** @summary Get only the current user's assigned recipient and wishlist */
export declare function useGetMyAssignment<TData = Awaited<ReturnType<typeof getMyAssignment>>, TError = ErrorType<ErrorResponse>>(roomCode: string, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getMyAssignment>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export {};
//# sourceMappingURL=api.d.ts.map