# Random suffix so the bucket name is globally unique on every fresh apply
resource "random_id" "suffix" {
  byte_length = 4
}

# S3 bucket that holds the compiled React/Vite build
resource "aws_s3_bucket" "frontend" {
  bucket        = "${var.project}-frontend-${random_id.suffix.hex}"
  force_destroy = true

  tags = {
    Name = "${var.project}-frontend"
  }
}

# Lift all public-access blocks so the bucket policy can allow public reads
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Enable static website hosting so CloudFront can use the HTTP website endpoint
resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

# Bucket policy that allows anyone to GET objects (CloudFront serves them publicly)
resource "aws_s3_bucket_policy" "frontend" {
  bucket     = aws_s3_bucket.frontend.id
  depends_on = [aws_s3_bucket_public_access_block.frontend]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicRead"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend.arn}/*"
      }
    ]
  })
}

# Collect every file inside ../dist because Terraform is run from ARCO/terraform
locals {
  frontend_dist_files = fileset("${path.module}/../dist", "**/*")

  mime_types = {
    html = "text/html"
    css  = "text/css"
    js   = "application/javascript"
    mjs  = "application/javascript"
    json = "application/json"
    map  = "application/json"
    png  = "image/png"
    jpg  = "image/jpeg"
    jpeg = "image/jpeg"
    svg  = "image/svg+xml"
    ico  = "image/x-icon"
    txt  = "text/plain"
    webp = "image/webp"
    gif  = "image/gif"
    mp3  = "audio/mpeg"
    wav  = "audio/wav"
    ogg  = "audio/ogg"
    webm = "audio/webm"
    mp4  = "video/mp4"
    woff = "font/woff"
    woff2 = "font/woff2"
    ttf  = "font/ttf"
    eot  = "application/vnd.ms-fontobject"
  }
}

# Upload the built frontend files from ../dist into the bucket root
resource "aws_s3_object" "frontend_files" {
  for_each = {
    for file in local.frontend_dist_files : file => file
    if !endswith(file, "/")
  }

  bucket = aws_s3_bucket.frontend.id
  key    = each.value
  source = "${path.module}/../dist/${each.value}"
  etag   = filemd5("${path.module}/../dist/${each.value}")

  content_type = lookup(
    local.mime_types,
    lower(element(reverse(split(".", each.value)), 0)),
    "application/octet-stream"
  )

  depends_on = [
    aws_s3_bucket.frontend
  ]
}