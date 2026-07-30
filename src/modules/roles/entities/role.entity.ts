import { ApiProperty } from '@nestjs/swagger';

export class RoleEntity {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'admin' })
  name: string;
}
