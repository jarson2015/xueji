import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser, JournalService } from './journal.service';

class CreatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsString()
  moodTag?: string;

  @IsOptional()
  @IsIn(['family', 'parents'])
  visibility?: 'family' | 'parents';

  @IsOptional()
  imageUrls?: string[];
}

class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  body?: string;

  @IsOptional()
  @IsString()
  moodTag?: string;

  @IsOptional()
  @IsIn(['family', 'parents'])
  visibility?: 'family' | 'parents';

  @IsOptional()
  imageUrls?: string[];
}

class CommentDto {
  @IsString()
  @MaxLength(200)
  body: string;

  @IsOptional()
  @IsInt()
  parentCommentId?: number;
}

class PrefsDto {
  @IsBoolean()
  privateDiaryEnabled: boolean;
}

class NotifyPrefsDto {
  @IsBoolean()
  commentPushEnabled: boolean;
}

class DiaryDto {
  @IsString()
  @MaxLength(500)
  body: string;

  @IsOptional()
  @IsString()
  moodTag?: string;
}

class UpdateDiaryDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  body?: string;

  @IsOptional()
  @IsString()
  moodTag?: string;
}

class ShareDiaryDto {
  @IsOptional()
  @IsIn(['family', 'parents'])
  visibility?: 'family' | 'parents';

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

@Controller('journal')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JournalController {
  constructor(private readonly journal: JournalService) {}

  @Get('posts')
  @Roles(UserRole.PARENT, UserRole.STUDENT)
  listPosts(
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: string,
    @Query('beforeId') beforeId?: string,
  ) {
    return this.journal.listPosts(user, {
      limit: limit ? Number(limit) : undefined,
      beforeId: beforeId ? Number(beforeId) : undefined,
    });
  }

  @Post('posts')
  @Roles(UserRole.PARENT, UserRole.STUDENT)
  createPost(@CurrentUser() user: AuthUser, @Body() dto: CreatePostDto) {
    return this.journal.createPost(user, dto);
  }

  @Get('posts/:id')
  @Roles(UserRole.PARENT, UserRole.STUDENT)
  getPost(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.journal.getPost(user, id);
  }

  @Patch('posts/:id')
  @Roles(UserRole.PARENT, UserRole.STUDENT)
  updatePost(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePostDto,
  ) {
    return this.journal.updatePost(user, id, dto);
  }

  @Patch('posts/:id/delete')
  @Roles(UserRole.PARENT, UserRole.STUDENT)
  deletePost(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.journal.softDeletePost(user, id);
  }

  @Get('posts/:id/comments')
  @Roles(UserRole.PARENT, UserRole.STUDENT)
  listComments(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.journal.listComments(user, id);
  }

  @Post('posts/:id/comments')
  @Roles(UserRole.PARENT, UserRole.STUDENT)
  addComment(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CommentDto,
  ) {
    return this.journal.addComment(user, id, dto.body, dto.parentCommentId);
  }

  @Patch('comments/:id/delete')
  @Roles(UserRole.PARENT, UserRole.STUDENT)
  deleteComment(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.journal.softDeleteComment(user, id);
  }

  @Get('activity-hint')
  @Roles(UserRole.PARENT, UserRole.STUDENT)
  activityHint(@CurrentUser() user: AuthUser) {
    return this.journal.activityHint(user);
  }

  @Post('mark-seen')
  @Roles(UserRole.PARENT, UserRole.STUDENT)
  markSeen(@CurrentUser() user: AuthUser) {
    return this.journal.markFeedSeen(user);
  }

  @Get('notify-prefs')
  @Roles(UserRole.PARENT, UserRole.STUDENT)
  getNotifyPrefs(@CurrentUser() user: AuthUser) {
    return this.journal.getNotifyPrefs(user);
  }

  @Patch('notify-prefs')
  @Roles(UserRole.PARENT, UserRole.STUDENT)
  setNotifyPrefs(
    @CurrentUser() user: AuthUser,
    @Body() dto: NotifyPrefsDto,
  ) {
    return this.journal.setNotifyPrefs(user, dto.commentPushEnabled);
  }

  @Get('private-diary/prefs')
  @Roles(UserRole.STUDENT)
  getPrefs(@CurrentUser() user: AuthUser) {
    return this.journal.getPrefs(user);
  }

  @Patch('private-diary/prefs')
  @Roles(UserRole.STUDENT)
  setPrefs(@CurrentUser() user: AuthUser, @Body() dto: PrefsDto) {
    return this.journal.setPrefs(user, dto.privateDiaryEnabled);
  }

  @Get('private-diary')
  @Roles(UserRole.STUDENT)
  listDiary(@CurrentUser() user: AuthUser) {
    return this.journal.listDiary(user);
  }

  @Post('private-diary')
  @Roles(UserRole.STUDENT)
  createDiary(@CurrentUser() user: AuthUser, @Body() dto: DiaryDto) {
    return this.journal.createDiary(user, dto);
  }

  @Patch('private-diary/:id')
  @Roles(UserRole.STUDENT)
  updateDiary(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDiaryDto,
  ) {
    return this.journal.updateDiary(user, id, dto);
  }

  @Patch('private-diary/:id/delete')
  @Roles(UserRole.STUDENT)
  deleteDiary(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.journal.softDeleteDiary(user, id);
  }

  @Post('private-diary/:id/share-to-family')
  @Roles(UserRole.STUDENT)
  share(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ShareDiaryDto,
  ) {
    return this.journal.shareDiaryToFamily(user, id, {
      visibility: dto?.visibility,
      force: !!dto?.force,
    });
  }
}
