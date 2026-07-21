IF EXISTS (SELECT TOP 1 1 FROM DBO.SYSOBJECTS WITH(NOLOCK) WHERE ID = OBJECT_ID(N'[DBO].[W02P0001]') AND OBJECTPROPERTY(ID, N'IsProcedure') = 1)
DROP PROCEDURE [DBO].[W02P0001]
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_NULLS ON
GO

-- <Summary>
---- Hien thi danh sach tai lieu quan luc
-- <Param>s
---- 
-- <Return>
---- 
-- <Reference>	
---- 
-- <ChangeHistory>
---- Create on 11/07/2026 by NgocDuy  Hien thi danh sach tai lieu quan luc
---EXEC W02P0001 @UserID = 'U002', @DocumentID = 'DOC002'; --câu test store


CREATE PROCEDURE W02P0001
(
    @UserID VARCHAR(50),
    @DocumentID VARCHAR(50)
)
AS
BEGIN

    SET NOCOUNT ON;
	IF ISNULL(@DocumentID,'') = ''
	BEGIN
    -- Thông tin tài liệu
		SELECT
			T1.DocumentID,
			T1.DocumentName,
			T1.CreatedDate,
			T1.UnitID,
			T2.Description
		FROM MilitaryDocument T1
		LEFT JOIN STATUS T2 ON T1.StatusID = T2.StatusID

		
	END
	ELSE
	BEGIN
    -- Thông tin tài liệu
		SELECT
			T1.DocumentID,
			T1.DocumentName,
			T1.CreatedDate,
			T1.UnitID,
			T2.Description,
			T1.Content
		FROM MilitaryDocument T1
		LEFT JOIN STATUS T2 ON T1.StatusID = T2.StatusID
		WHERE T1.DocumentID = @DocumentID

		-- Danh sách file đính kèm
		SELECT *
		FROM AttachmentFile 
		WHERE ReferenceID = @DocumentID
		ORDER BY UploadedDate DESC
	END
END

GO
SET QUOTED_IDENTIFIER OFF
GO
SET ANSI_NULLS ON
GO

