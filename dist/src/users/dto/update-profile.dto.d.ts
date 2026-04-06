import { Gender } from '@prisma/client';
export declare class UpdateProfileDto {
    displayName?: string;
    avatarUrl?: string;
    dateOfBirth?: string;
    gender?: Gender;
    bio?: string;
    timezone?: string;
}
