provider "aws" {
  region = "us-west-1"  # Change to your preferred region
}

# Key pair to use for EC2 SSH access (replace with your key name)
resource "aws_key_pair" "deployer" {
  key_name   = "myfirstawskey"
  public_key = file("~/.ssh/myfirstawskey.pub")  # Must be .pub file, not .pem
}

# Security Group allowing HTTP (3000) and SSH (22)
resource "aws_security_group" "app_sg" {
  name        = "app-security-group"
  description = "Allow SSH and HTTP traffic"

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "App HTTP"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# EC2 Instance
resource "aws_instance" "app_server" {
  ami           = "ami-038bba9a164eb3dc1" # Amazon Linux 2023 AMI for us-west-1
  instance_type = "t2.micro"
  key_name      = aws_key_pair.deployer.key_name
  security_groups = [aws_security_group.app_sg.name]

  user_data = <<-EOF
              #!/bin/bash
              # Update system
              yum update -y

              # Install Node.js 18.x
              curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
              yum install -y nodejs

              # Install git
              yum install -y git

              # Create app directory
              mkdir -p /home/ec2-user/app
              cd /home/ec2-user/app

              # Set permissions
              chown -R ec2-user:ec2-user /home/ec2-user/app
              EOF

  tags = {
    Name = "PhotoAppServer"
  }
}

# S3 Bucket
resource "aws_s3_bucket" "photo_bucket" {
  bucket = "sbalaji-codebox-photos-2025"  # Match bucket name in server.js

  tags = {
    Name = "PhotoUploadBucket"
  }
}

# S3 Bucket ownership controls
resource "aws_s3_bucket_ownership_controls" "photo_bucket" {
  bucket = aws_s3_bucket.photo_bucket.id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

# S3 Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "photo_bucket" {
  bucket = aws_s3_bucket.photo_bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# S3 Bucket ACL (must come after ownership controls)
resource "aws_s3_bucket_acl" "photo_bucket" {
  depends_on = [
    aws_s3_bucket_ownership_controls.photo_bucket,
    aws_s3_bucket_public_access_block.photo_bucket,
  ]

  bucket = aws_s3_bucket.photo_bucket.id
  acl    = "public-read"
}
