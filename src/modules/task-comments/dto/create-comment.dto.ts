import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Looks good, one nit on the migration name.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body: string;
}
