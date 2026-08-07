import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  JournalComment,
  JournalPost,
  JournalReaderState,
  JournalStudentPrefs,
  JournalUserPrefs,
  PrivateDiaryEntry,
} from '../entities/journal.entity';
import { User } from '../entities/user.entity';
import { JournalService } from './journal.service';
import { JournalController } from './journal.controller';
import { StudentsModule } from '../students/students.module';
import { FamilyModule } from '../family/family.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JournalPost,
      JournalComment,
      PrivateDiaryEntry,
      JournalStudentPrefs,
      JournalReaderState,
      JournalUserPrefs,
      User,
    ]),
    forwardRef(() => StudentsModule),
    forwardRef(() => FamilyModule),
    PushModule,
  ],
  providers: [JournalService],
  controllers: [JournalController],
  exports: [JournalService],
})
export class JournalModule {}
