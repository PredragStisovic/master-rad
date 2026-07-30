import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutDto {
  @ApiProperty({ example: 'y0h0Yy1jZjc4LTQ0YjMtOWQ2Ni1kMGI4ZmY0ZDU5YzA=' })
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}
