import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { ParentStudent } from '../entities/parent-student.entity';
import {
  StudentDailyFocus,
  StudentWeeklyGoal,
} from '../entities/student-prefs.entity';
import { StudentWeeklyReview } from '../entities/student-weekly-review.entity';
import { JournalPost } from '../entities/journal.entity';
import { CheckIn } from '../entities/checkin.entity';
import { TaskAssign } from '../entities/task-assign.entity';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { StudentMeController } from './student-me.controller';
import { StudentPrefsService } from './student-prefs.service';
import { FamilyModule } from '../family/family.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      ParentStudent,
      StudentWeeklyGoal,
      StudentDailyFocus,
      StudentWeeklyReview,
      JournalPost,
      CheckIn,
      TaskAssign,
    ]),
    forwardRef(() => FamilyModule),
    forwardRef(() => AuthModule),
  ],
  providers: [StudentsService, StudentPrefsService],
  controllers: [StudentsController, StudentMeController],
  exports: [StudentsService, StudentPrefsService],
})
export class StudentsModule {}
